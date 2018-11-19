/**
 * @file Transition
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Store, StoredState} from "../store/index";

import Promise from "bluebird";
import {cloneDeep, isEqual} from 'lodash/fp'

interface Transition {
  to: string
  wait?: number
}



export class TransitionContainer {
  private readonly metadata: any
  private readonly transitionFunction: Function
  private readonly Store: Store
  private transitionUuid: string
  private transitionResult: Transition
  private transitionCursor: number
  private readonly transitionName: string

  private initialStateUuid: string
  private initialState: any
  private startingState: StoredState
  private endingState: StoredState


  private transitionError: Error | null

  constructor(taskMetadata: any, transitionName: string, transitionFunction: Function,  startingState: any, Store: Store, transitionCursor: number){
    this.metadata = taskMetadata
    this.transitionName = transitionName
    this.transitionFunction = transitionFunction
    this.Store = Store
    this.transitionCursor = transitionCursor
    this.initialStateUuid = startingState
    this.initialState = startingState
    this.transitionError = null
  }

  run(){
    return this.Store.createState(this.metadata.uuid, this.initialState)
      .then((stateObj) => {
        this.startingState = stateObj
        this.endingState = stateObj
        return this.Store.createTransition(this.metadata.uuid, this.transitionName, this.transitionCursor, stateObj.uuid)
      })
      .then((transitionUuid: string) => {
        this.transitionUuid = transitionUuid
        let cloned = cloneDeep(this.startingState.state)
        return Promise.resolve(this.transitionFunction(cloned, this.metadata))
      })
      .then((val: [Transition, any]) => {

        let endingState = val[1]
        this.transitionResult = val[0]

        if(isEqual(this.startingState.state, endingState)){
          return this.end()
        }


        return this.changedState(endingState)
      })
      .catch((error) => {
        this.transitionResult = {to: 'error'}
        this.transitionError = error
        return this.end()
      })
  }


  changedState(mutatedState: any){
    return this.Store.createState(this.metadata.uuid, mutatedState)
      .then((stateObj) => {
        this.endingState = stateObj
        return this.end()
      })
  }

  end(){
    return this.Store.closeTransition(this.metadata.uuid, this.transitionUuid, this.endingState.uuid, this.transitionError)
      .then((result) => {
        return [this.transitionResult, this.endingState.state]
      })
  }
}