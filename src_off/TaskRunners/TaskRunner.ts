/**
 * @file TaskRunner
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import Promise from 'bluebird'
import {Store} from "../store";
import {TransitionContainer} from "./Transition";
import moment from 'moment'

interface TaskConfig {
  name: string
  initial: string
  retryOnError?: boolean
  retryDelay?: number,
  rolloffMultiplier?: number,
  retryAttempts?: number
}

interface TransitionStates {
  [key: string]: Function
}

export interface TaskHandler {
  config: TaskConfig,
  states: TransitionStates
}

export interface TaskStats {
  uuid: string,
  transitions: number,
  error: Error | null,
  handler: string,
  startTime: string,
  endTime: string,
  duration: number
}

export interface Transition {
  to: string,
  wait?: number
  done?: boolean
}

interface RunnerConstructor {
  new (taskHandler: TaskHandler, taskData: any, Store: Store): Runner
}

export interface Runner {
  transitionCursor: number
  taskName: string
  initialTransition: string
  uuid: string
  run(): Promise<any>
  transition(): Promise<any>
}


export class TaskRunner {
  public initialTransition: string
  public taskName: string

  protected uuid: string
  protected readonly startTime: moment.Moment
  protected endTime: moment.Moment
  protected readonly Store: Store
  protected cursor: number
  protected metadata: any
  protected State: any

  protected states: TransitionStates
  protected pendingTransition: Function

  protected previousTransitionContainer: TransitionContainer | null
  protected currentTransitionContainer: TransitionContainer | null

  constructor(taskHandler: TaskHandler, taskData: any, store: Store) {
    this.Store = store
    this.cursor = 0
    this.metadata = taskData.metadata
    this.State = taskData.state
    this.taskName = taskData.metadata.name
    this.initialTransition = taskHandler.config.initial
    this.states = taskHandler.states
    this.startTime = moment().utc()
  }


  private taskStats(error?: Error) : Promise<TaskStats>{
    this.endTime = moment().utc()
    let stats: TaskStats = {
      uuid: this.uuid,
      transitions: this.cursor,
      error: error || null,
      handler: this.constructor.name,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      duration: this.endTime.diff(this.startTime)
    }

    return Promise.resolve(stats)
  }

  private waitForTransition(transition: Transition){
    return Promise.delay(transition.wait)
      .then(() => {
        return this.transition({to: transition.to})
      })
  }

  private internalState(transition?: Transition){
    switch (transition.to) {
      case 'done':
        return this.taskStats()
      case 'error':
        return this.taskStats(new Error('This Task encountered an error.'))
      default:
        console.log('Default')
    }
  }

  createTransition(transition?: Transition){
    this.previousTransitionContainer = this.currentTransitionContainer
    this.currentTransitionContainer = new TransitionContainer(this.metadata, transition.to, this.pendingTransition, this.State, this.Store, this.cursor)
  }

  transition(transition?: Transition){
    if(transition.to === 'error' || transition.to === 'done'){
      return this.internalState(transition)
    }

    if(transition.wait){
      return this.waitForTransition(transition)

    }
    this.cursor += 1
    this.pendingTransition = this.states[transition.to]

    this.currentTransitionContainer = new TransitionContainer(this.metadata, transition.to, this.pendingTransition, this.State, this.Store, this.cursor)
    return this.currentTransitionContainer.run()
      .then((transitionResult: [Transition, any]) => {
        this.State = transitionResult[1]
        if(transitionResult[0].done){
          return this.metadata
        }
        return this.transition(transitionResult[0])

      })
      .then((result) => {
        return result
      })
  }



}