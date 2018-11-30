/**
 * @file TaskRunner
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Bluebird from 'bluebird'
import {TaskController, TaskTypes} from "./TaskController";
import {TaskHandler} from "./TaskHandler";
import {Store} from "./store"
import {Transition, StateChange} from "./Transition";
import moment from "moment";
import {ExigencyLogger, ExigencySettings} from "./Exigency";

export class TaskRunner {
  private currentTransition: number
  private readonly startTime: moment.Moment
  private endTime: moment.Moment | null
  private incomplete: boolean
  private duration: number

  constructor(public taskController: TaskController, private taskHandler: TaskHandler, private Store: Store, private Settings: ExigencySettings, private Logger: ExigencyLogger) {
    this.startTime = moment().utc()
    this.endTime = this.startTime
    this.incomplete = false
  }

  retryOrFail(error?: boolean) {

    if (this.taskController.getRetriesRemaining()) {
      this.incomplete = true
      let multiplier = this.taskHandler.getConfig().delayMultiplier

      return this.Store.updateTask(this.taskController.getUuid(), {retryDelay: delay => Math.ceil(delay * multiplier)})
        .then((result) => {
          let delay = this.taskController.getRetryDelay()

          return Bluebird.delay(delay).then(() => {
            return this.requeueTask(error)
          })
        })

    }

    return this.failTask(error)

  }

  failTask(error: boolean) {

    let conf = this.taskHandler.getConfig()

    return this.Store.updateTask(this.taskController.getUuid(), {complete: true})
      .then(() => {
        return [this.stats('failure', error), null]
      })
  }

  closeTask(error?: Error) {

    if (!!error) {
      this.incomplete = true
    }
    this.endTime = moment().utc()
    let closeOrSuspend = error ? this.Store.updateTask(this.taskController.getUuid(), {error: true}) : this.Store.updateTask(this.taskController.getUuid(), {
      complete: true,
      error: false
    })
    return closeOrSuspend
      .then(() => {
        return [this.stats('success', !!error), this.requeueData(error)]
      })
  }

  requeueTask(error?: boolean) {

    this.incomplete = true
    this.endTime = moment().utc()
    return this.Store.updateTask(this.taskController.getUuid(), {error: error})
      .then(() => {
        return [this.stats('requeue', error), this.requeueData(error)]
      })
  }


  requeueData(error) {
    if (this.incomplete) {
      return {
        metadata: {
          name: this.taskController.getName(),
          uuid: this.taskController.getUuid(),
          error: !!error
        }
      }
    }

    return null
  }

  stats(ResultType: string, error?: boolean) {
    let now = this.endTime ? this.endTime : moment().utc()
    let retVal = {
      name: this.taskController.getName(),
      uuid: this.taskController.getUuid(),
      transitions: this.taskController.getCurrentTransition(),
      error: error || null,
      type: this.taskController.getType(),
      result: ResultType,
      retryDelay: this.taskController.getRetryDelay(),
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString() || null,
      duration: now.diff(this.startTime)
    }

    return retVal
  }

  run() {
    return Bluebird.try(() => {
      let taskType: TaskTypes = this.taskController.getType()

      switch (taskType) {
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
    return this.Store.createTask({
      name: this.taskController.getName(),
      retriesRemaining: this.taskHandler.getConfig().retryLimit,
      retryDelay: this.taskHandler.getConfig().retryDelay
    })
      .then((result) => {

        this.Logger.log(`Starting Fresh Task: ${result.name}`)
        // this.taskController.setTaskState(result)
        // this.taskController.setUuid(result.uuid)
        this.taskController.update({
          uuid: result.uuid,
          currentTransition: result.currentTransition,
          retriesRemaining: result.retriesRemaining,
          retryDelay: result.retryDelay
        })
        return this.Store.createState(result.uuid, this.taskController.getPayload())
      })
      .then((stateResult) => {
        // this.taskController.setState(stateResult)
        this.taskController.update({currentState: stateResult})
        let t = new Transition(this.taskController, {initial: true}, this.taskHandler, this.Store)
        return this.transition(t)
      })

  }

  resumeError() {
    return this.Store.getTask(this.taskController.getUuid())
      .then((errorTask) => {
        return this.Store.updateTask(errorTask.uuid, {
          currentTransition: count => count + 1,
          retriesRemaining: count => count - 1,
          retryAttempts: count => count + 1
        })
      })
      .then((errorTask) => {
        this.taskController.update({
          currentTransition: errorTask.currentTransition,
          retriesRemaining: errorTask.retriesRemaining,
          retryDelay: errorTask.retryDelay
        })
        // this.taskController.setRetriesRemaining(errorTask.retriesRemaining)
        // this.taskController.setCurrentTransition(errorTask.currentTransition)
        // this.taskController.setRetryDelay(errorTask.retryDelay)
        return this.retryTask(errorTask)
      })
  }

  resumeSuspended() {
    return this.Store.getTask(this.taskController.getUuid())
      .then((suspendedTask) => {
        return this.Store.updateTask(suspendedTask.uuid, {
          currentTransition: count => count + 1,
          requeueCount: count => count + 1
        })
      })
      .then((suspendedTask) => {
        this.taskController.update({currentTransition: suspendedTask.currentTransition})
        // this.taskController.setCurrentTransition(suspendedTask.currentTransition)
        return this.retryTask(suspendedTask)
      })
  }

  retryTask(t) {
    let pendingTransitionUuid
    let pendingTransitionName
    let pendingResult

    /* Put a couple of variable on the scope so we can come back to them later, then get the starting state
     * from our last in-error transition.
     */

    return this.Store.findTransition(t.uuid, this.taskController.getPreviousTransition())
      .then((errorTransition) => {
        pendingTransitionUuid = errorTransition.uuid
        pendingTransitionName = errorTransition.name

        return this.Store.getState(this.taskController.getUuid(), errorTransition.startingState)
      })
      /* Set the state we found in the taskController, then update the task to reflect the newest retry.
       * Build and run a new transition, using the same parameters as the one that is being retried.
       */
      .then((startingState) => {
        this.taskController.update({currentState: startingState})
        // this.taskController.setState(startingState)
        let t = new Transition(this.taskController, {to: pendingTransitionName}, this.taskHandler, this.Store)
        return t.run()
      })
      /* Save our transitionDestination to the scope for later. Set complete: true on the prior transition.
       */
      .then((transitionResult) => {
        pendingResult = transitionResult
        this.taskController.incrementCurrentTransition()
        return this.Store.updateTransition(this.taskController.getUuid(), pendingTransitionUuid, {complete: true})
      })
      /* Finally we create a new Transition from the saved transitionDestination and hand it off to normal flow control.
       */
      .then((result) => {
        if (pendingResult.error) {
          return this.retryOrFail(pendingResult.error)
        }
        let destination: StateChange = {
          to: pendingResult.destination,
          wait: pendingResult.wait,
          requeue: pendingResult.requeue
        }

        let t = new Transition(this.taskController, destination, this.taskHandler, this.Store)
        return this.transition(t)
      })
      /* Bail out normally if we encounter an error.
       */
      .catch((error) => {

        return this.Store.updateTransition(this.taskController.getUuid(), pendingTransitionUuid, {
          complete: true,
          error: error
        })
          .then(() => {

            return this.retryOrFail(!!error)
          })
      })
  }


  transition(transition?: Transition) {
    if (this.Settings.debugLogging) {
      this.Logger.log('Transition pending:', transition.getDestination())
    }
    let destination: StateChange
    return transition.run()
      .then((transitionResult) => {
        if (transitionResult.error) {
          return this.retryOrFail(transitionResult.error)
        }

        if (transitionResult.requeue) {
          return this.requeueTask()
        }

        if (transitionResult.destination === 'done') {
          return this.closeTask()
        }

        this.taskController.incrementCurrentTransition()

        destination = {
          to: transitionResult.destination,
          wait: transitionResult.wait,
          requeue: transitionResult.requeue
        }
        // return true
        let t = new Transition(this.taskController, destination, this.taskHandler, this.Store)

        return this.transition(t)
      })
      // .then((result) => {
      //
      //   let t = new Transition(this.taskController, destination, this.taskHandler, this.Store)
      //
      //   return this.transition(t)
      // })
      .catch((error) => {

        return this.closeTask(error)
      })
  }
}