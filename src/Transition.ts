/**
 * @file Transition
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Promise from 'bluebird'
import {cloneDeep, isEqual} from 'lodash/fp'
import {SimpleStore, Store} from "./store";
import {TaskHandler} from "./TaskHandler";
import {TaskController} from "./TaskController";
import {TransitionUpdate} from "./store/Store";



export class Transition {
  private taskUuid: string
  private transitionUuid: string
  private transitionDestination: any
  private transitionError: Error | null
  private startingState: any
  private endingState: any
  private suspend: any
  private handler: Function

  // TaskController needs a startingState.uuid field set to control join of starting state in store.
  constructor(private taskController: TaskController, private stateChange: any, private taskHandler: TaskHandler, private Store: SimpleStore) {
    this.suspend = null
    this.transitionError = null
    this.taskUuid = taskController.getUuid()
  }


  getDestination(){
    return this.stateChange
  }

  taskControl(){
    return {
      suspend: (wait?: number) => {
        this.suspend = {suspend: wait}
      }
    }
  }

  internalError(){
    return [{to: 'error'}, this.startingState]
  }

  internalWait(wait, handler){
    return Promise.delay(wait)
      .then(() => {
        return handler
      })
  }

  configure(): Promise<Function> {
    return Promise.try(() => {
      if (this.stateChange.initial) {
        let initial = this.taskHandler.getInitial()
        this.taskController.setTransitionName(initial.name)
        return initial.handler
      }

      let handler = this.taskHandler.getHandler(this.stateChange)
      if(handler){
        if(this.stateChange.wait){
          return this.internalWait(this.stateChange.wait, handler)
        }
          this.taskController.setTransitionName(this.stateChange.to)
          return handler
      }

      throw new Error('Requested transition does not exist.')
    })

  }

  run() {

    return this.configure()
      .then((runFn: Function) => {

        this.handler = runFn
        return this.taskController.getState()
      })
      .then((stateObj) => {
        this.startingState = stateObj
        this.endingState = stateObj
        return this.Store.createTransition(this.taskUuid, this.taskController.getTransitionName(), stateObj.uuid,this.taskController.getCurrentTransition())
      })
      .then((storedTransition) => {
        this.transitionUuid = storedTransition.uuid
        let cloned = this.taskController.getState().state


        return Promise.resolve(this.handler(cloned, this.taskControl()))
      })
      .then((result) => {

        let mutatedState = result[1]
        this.transitionDestination = result[0]


        if(isEqual(this.startingState.state, mutatedState)){
          return this.end()
        }

        return this.changedState(mutatedState)
      })
      .catch((error) => {
        this.transitionDestination = {to: 'error'}
        this.transitionError = error
        return this.end(error)
      })
  }


  changedState(mutatedState: any){

    return this.Store.createState(this.taskUuid, mutatedState)
      .then((stateObj) => {
        this.taskController.setState(stateObj)
        this.endingState = stateObj
        return this.end()
      })
  }

  end(error?: Error){
    let updateData: TransitionUpdate = {
      complete: !error,
      endingState: this.endingState.uuid,
      destination: this.transitionDestination.to,
      error: error || null
    }
    return this.Store.updateTransition(this.taskUuid, this.transitionUuid, updateData)//this.endingState.uuid,this.transitionDestination, error)
      .then((result) => {
        if(error){
          throw new Error('Transition encountered a runtime error.')
        }
        return this.transitionDestination
      })
  }


}