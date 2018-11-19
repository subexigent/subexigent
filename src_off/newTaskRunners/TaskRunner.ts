/**
 * @file TaskRunner
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import Promise from 'bluebird'
import {Store} from "../store";
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

interface StateConfig {
  uuid: string | null
  stateObject: any | null
}

export interface Runner {
  transitionCursor: number
  taskName: string
  initialTransition: string
  uuid: string
  run(): Promise<any>
  transition(): Promise<any>
}

export class Transition {
  private readonly Store: Store
  private readonly taskMetadata: any
  private startingStateUuid: any | null
  private startingState: any | null
  private endingState: any | null
  constructor(store: Store, taskMetadata: any, transitionFunction: Function, startingState: any, startingStateUuid: string = null ){
    this.Store = store
    this.taskMetadata = taskMetadata
    this.startingState = startingState
    this.startingStateUuid = startingStateUuid;
  }

  run(){
    return this.Store.findOrCreateState(this.taskMetadata.uuid, this.startingStateUuid, this.startingState)
      .then((stateObj) => {

      })
  }
}

export class TaskRunner {
  public taskName: string

  protected uuid: string
  protected taskMetadata: any
  protected readonly startTime: moment.Moment
  protected endTime: moment.Moment
  protected readonly Store: Store
  protected states: TransitionStates
  protected transitionCursor: number
  protected initialState: any
  protected previousTransition: Transition | null
  protected currentTransition: Transition | null

  constructor(taskHandler: TaskHandler, taskData, store: Store){
    this.Store = store
    this.taskMetadata = taskData.metadata
    this.states = taskHandler.states
  }


}

export class ResumeErrorTask extends TaskRunner implements Runner {
  transitionCursor: number
  taskName: string
  initialTransition: string
  uuid: string

  constructor(taskHandler: TaskHandler, taskData: any, Store: Store) {
    super(taskHandler, taskData, Store);
    this.transitionCursor = 0
    this.initialTransition = taskHandler.config.initial
    this.uuid = taskData.metadata.uuid
  }

  run(): Promise<any> {
    return this.initialize()
  }

  initialize(){

    return this.Store.getLastTransitionError(this.uuid)
  }
}