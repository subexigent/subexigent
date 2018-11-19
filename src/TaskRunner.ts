/**
 * @file TaskRunner
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Bluebird from 'bluebird'
import {TaskController, TaskTypes} from "./TaskController";
import {TaskHandler} from "./TaskHandler";
import {SimpleStore, Store} from "./store"
import {Transition} from "./Transition";
import moment from "moment";
import {ExigencyLogger, ExigencySettings} from "./Exigency";

export class TaskRunner {
  private currentTransition: number
  private readonly startTime: moment.Moment
  private endTime: moment.Moment | null
  private incomplete: boolean
  private duration: number

  constructor(public taskController: TaskController, private taskHandler: TaskHandler, private Store: SimpleStore, private Settings: ExigencySettings, private Logger: ExigencyLogger) {
    this.startTime = moment().utc()
    this.endTime = this.startTime
    this.incomplete = false
  }

  failTask(error: Error) {
    return this.Store.updateTask(this.taskController.getUuid(), {complete: true})
      .then(() => {
        return this.stats(error)
      })
  }

  closeTask(error?: Error){
    if(!!error){
      this.incomplete = true
    }
    this.endTime = moment().utc()
    let closeOrSuspend = error ? this.Store.updateTask(this.taskController.getUuid(), {error: true}) : this.Store.updateTask(this.taskController.getUuid(), {complete: true, error: false})
    return closeOrSuspend
      .then(() => {
        return this.stats(error)
      })
  }

  requeueTask(){
    this.incomplete = true
    this.endTime = moment().utc()
    return this.Store.updateTask(this.taskController.getUuid(), {error: false})
      .then(() => {
        return this.stats()
      })
  }

  stats(error?: Error) {
    let now = this.endTime ? this.endTime : moment().utc()
    let retVal ={
      name: this.taskController.getName(),
      uuid: this.taskController.getUuid(),
      transitions: this.taskController.getCurrentTransition(),
      error: error || null,
      type: this.taskController.getType(),
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString() || null,
      duration: now.diff(this.startTime),
      requeueTask: null
    }

    if(this.incomplete){
      retVal.requeueTask = {
        metadata: {
          name: this.taskController.getName(),
          uuid: this.taskController.getUuid(),
          error: !!error
        }
      }
    }


    return retVal
  }

  run() {
    return Bluebird.try(() => {
      let taskType: TaskTypes = this.taskController.getType()
      switch(taskType) {
        case TaskTypes.Fresh:
          return this.freshTask()
        case TaskTypes.ResumeSuspended:
          return this.resumeSuspended()
        case TaskTypes.ResumeError:
          return this.resumeError()
      }

    })

  }

  freshTask() {
    return this.Store.createTask(this.taskController.getName())
      .then((result) => {
        this.Logger.log(`Starting Fresh Task: ${result.name}`)
        this.taskController.setUuid(result.uuid)
        this.taskController.setCurrentTransition(result.currentTransition)
        return this.Store.createState(result.uuid, this.taskController.getPayload())
      })
      .then((stateResult) => {
        this.taskController.setState(stateResult)
        let t = new Transition(this.taskController, {initial: true}, this.taskHandler, this.Store)
        return this.transition(t)
      })

  }

  resumeError(){
    return this.Store.getTask(this.taskController.getUuid())
      .then((errorTask) => {
        let conf = this.taskHandler.getConfig()
        this.taskController.setCurrentTransition(errorTask.currentTransition + 1)
        if(errorTask.retryAttempts >= conf.retryAttempts){
          return this.failTask(new Error('Retry attempts exceeded'))
        }

        if(conf.retryOnError){
          return this.retryTask(errorTask)
        }
        return this.failTask(new Error('Error retry not available.'))
      })
  }

  resumeSuspended() {
    return this.Store.getTask(this.taskController.getUuid())
      .then((suspendedTask) => {
        this.taskController.setCurrentTransition(suspendedTask.currentTransition + 1)
        return this.retryTask(suspendedTask)
      })
  }

  retryTask(t) {

    let pendingTransitionUuid
    let pendingTransitionName
    let pendingDestination

    /* Put a couple of variable on the scope so we can come back to them later, then get the starting state
     * from our last in-error transition.
     */

    return this.Store.findTransition(t.uuid, this.taskController.getCurrentTransition() - 1)
      .then((errorTransition) => {
        pendingTransitionUuid = errorTransition.uuid
        pendingTransitionName = errorTransition.name

        return this.Store.getState(this.taskController.getUuid(), errorTransition.startingState)
      })
      /* Set the state we found in the taskController, then update the task to reflect the newest retry.
       */
      .then((startingState) => {
        this.taskController.setState(startingState)
        return this.Store.updateTask(this.taskController.getUuid(), {retryAttempts: count => count + 1})
      })
      /* Build and run a new transition, using the same parameters as the one that is being retried.
       */
      .then((data) => {

        let t = new Transition(this.taskController, {to: pendingTransitionName}, this.taskHandler, this.Store)
        return t.run()
      })
      /* Save our transitionDestination to the scope for later. Set complete: true on the prior transition.
       */
      .then((transitionDestination) => {
        pendingDestination = transitionDestination
        this.taskController.incrementCurrentTransition()
        return this.Store.updateTransition(this.taskController.getUuid(), pendingTransitionUuid, {complete: true})
      })
      /* Finally we create a new Transition from the saved transitionDestination and hand it off to normal flow control.
       */
      .then((result) => {
        console.log(result)
        let t = new Transition(this.taskController, pendingDestination, this.taskHandler, this.Store)
        return this.transition(t)
      })
      /* Bail out normally if we encounter an error.
       */
      .catch((error) => {
        return this.Store.updateTransition(this.taskController.getUuid(), pendingTransitionUuid, {complete: true, error: error})
          .then(() => {
            return this.closeTask(error)
          })
      })
  }


  transition(transition?: Transition) {
    if(this.Settings.debugLogging){
      this.Logger.log('Transition pending:', transition.getDestination())
    }
    return transition.run()
      .then((transitionDestination) => {
        // console.log(transitionDestination)
        if(transitionDestination.requeue) {
          return this.requeueTask()
        }

        if (transitionDestination.to === 'done'){
          return this.closeTask()
        }

        this.taskController.incrementCurrentTransition()
        let t = new Transition(this.taskController, transitionDestination, this.taskHandler, this.Store)
        return this.transition(t)
      })
      .catch((error) => {
        return this.closeTask(error)
      })
  }
}