/**
 * @file TaskRunner2
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import Bluebird from 'bluebird'
import {TaskController} from "./TaskController";
import {TaskHandler} from "./TaskHandler";
import {Store} from "./store";
import {ExigencyLogger, ExigencySettings} from "./Exigency";
import {isFunction} from "lodash/fp";
import {StateChange, Transition, TransitionParams} from "./Transition";
import moment from "moment";
import {error} from "util";

export interface TaskRunnerParams {
  taskController: TaskController,
  taskHandler: TaskHandler,
  Store: Store,
  exigencySettings: ExigencySettings
  logger: ExigencyLogger
}

export class TaskRunner2 {

  private taskController: TaskController
  private taskHandler: TaskHandler
  private Store: Store
  private settings: ExigencySettings
  private Logger: ExigencyLogger
  private readonly startTime: moment.Moment
  private endTime: moment.Moment | null
  private incomplete: boolean

  constructor({taskController, taskHandler, Store, exigencySettings, logger}: TaskRunnerParams) {
    this.taskController = taskController
    this.taskHandler = taskHandler
    this.Store = Store
    this.settings = exigencySettings
    this.Logger = logger

    this.startTime = moment().utc()
    this.endTime = this.startTime
    this.incomplete = false
  }

  private Fresh() {
    return this.Store.createTask({
      name: this.taskController.getName(),
      retriesRemaining: this.taskHandler.getConfig().retryLimit,
      retryDelay: this.taskHandler.getConfig().retryDelay
    })
      .then((result) => {
        this.Logger.log(`Starting Fresh Task: ${result.name}`)
        this.taskController.update({
          uuid: result.uuid,
          currentTransition: result.currentTransition,
          retriesRemaining: result.retriesRemaining,
          retryDelay: result.retryDelay
        })
        return this.Store.createState(result.uuid, this.taskController.getPayload())
      })
      .then((stateResult) => {
        this.taskController.update({currentState: stateResult})
        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: {initial: true}
        }
        let t = new Transition(trRunData)
        return this.transition(t)
      })
  }

  private ResumeError() {

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

        return this.retryTask(errorTask)
      })
  }

  private ResumeSuspended() {
    return this.Store.getTask(this.taskController.getUuid())
      .then((suspendedTask) => {
        console.log(suspendedTask)
        return this.Store.updateTask(suspendedTask.uuid, {
          currentTransition: count => count + 1,
          requeueCount: count => count + 1
        })
      })
      .then((suspendedTask) => {
        this.taskController.update({
          currentTransition: suspendedTask.currentTransition,
          retriesRemaining: suspendedTask.retriesRemaining,
          retryDelay: suspendedTask.retryDelay
        })
        // this.taskController.setCurrentTransition(suspendedTask.currentTransition)
        return this.retryTask(suspendedTask)
      })
  }

  private retryOrFail(error?: Error) {
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

  private failTask(error?: any) {
    return this.Store.updateTask(this.taskController.getUuid(), {complete: true})
      .then(() => {
        return [this.stats('failure', error), null]
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
        console.log(errorTransition)
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
        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: {to: pendingTransitionName}
        }

        let t = new Transition(trRunData)
        return t.run()
      })
      /* Save our transitionDestination to the scope for later. Set complete: true on the prior transition.
       */
      .then((transitionResult) => {
        pendingResult = transitionResult
        console.log(this.taskController.getCurrentTransition(), 'retry')
        // this.taskController.incrementCurrentTransition() //fix this, needs to update task
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

        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: destination
        }

        let t = new Transition(trRunData)
        return this.transition(t)
      })
      /* Bail out normally if we encounter an error.
       */
      .catch((error) => {

        return this.Store.updateTransition(this.taskController.getUuid(), pendingTransitionUuid, {
          complete: true,
          error: error
        })
          .then((error) => {

            return this.retryOrFail(error)
          })
      })
  }


  private requeueTask(error?: any) {

    this.incomplete = true
    this.endTime = moment().utc()
    return this.Store.updateTask(this.taskController.getUuid(), {error: error})
      .then(() => {
        return [this.stats('requeue', error), this.requeueData(error)]
      })
  }

  private closeTask(error?: Error) {
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

  private stats(ResultType: string, error?: boolean) {
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

  private requeueData(error) {
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

  private transition(transition?: Transition) {
    console.log( this.taskController.getCurrentTransition() )
    if (this.settings.debugLogging) {
      this.Logger.log('Transition pending:', transition.getDestination())
    }
    let destination: StateChange
    return transition.run()
      .then((transitionResult) => {

        if (transitionResult.error) {
          this.Logger.log('Task Failed')
          return this.retryOrFail(transitionResult.error)
        }

        if (transitionResult.requeue) {
          return this.requeueTask()
        }

        if (transitionResult.destination === 'done') {
          return this.closeTask()
        }

        destination = {
          to: transitionResult.destination,
          wait: transitionResult.wait,
          requeue: transitionResult.requeue
        }
        return this.Store.updateTask(this.taskController.getUuid(), {currentTransition: count => {console.log(count); return count + 1}})
          .then((result) => {
            this.taskController.update({currentTransition: result.currentTransition})

            let trRunData: TransitionParams = {
              taskController: this.taskController,
              taskHandler: this.taskHandler,
              Store: this.Store,
              stateChange: destination
            }

            let t = new Transition(trRunData)

            return this.transition(t)
          })

      })

      .catch((error) => {

        return this.closeTask(error)
      })
  }

  run() {
    return Bluebird.try(() => {
      let type = this.taskController.getType()

      if (isFunction(this[type])) {
        return this[type]()
      }

      throw new Error(`Impossible state: No such handler method ${type}`)
    })
  }


}