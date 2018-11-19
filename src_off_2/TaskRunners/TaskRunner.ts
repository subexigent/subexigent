import Promise from "bluebird";
import moment from "moment";
import {Store} from "../store";
import {TaskHandler} from "../TaskHandler";
import {TaskData} from "../TaskData";
import {TransitionFactory, Transition} from "./Transition";

/**
 * @file TaskRunner
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

export interface Runner {
  transitionCursor: number
  taskName: string
  // initialTransition: string
  uuid: string
  initialize()
  run(): Promise<any>
  transition(): Promise<any>
}

export class TaskRunner {
  TaskHandler: TaskHandler
  TaskData: TaskData
  transitionCursor: number
  taskName: string
  uuid: string
  protected readonly startTime: moment.Moment
  protected endTime: moment.Moment
  protected readonly Store: Store
  protected TransitionFactory: TransitionFactory
  protected previousTransition: Transition
  protected currentTransition: Transition

  constructor(taskHandler: TaskHandler, taskData: TaskData, store: Store) {
    this.TaskHandler = taskHandler
    this.TaskData = taskData
    this.Store = store
    this.TransitionFactory = new TransitionFactory(this.TaskHandler, this.TaskData, this.Store)
  }

  transition(transition?: Transition): Promise<any>{
    return Promise.resolve(true)
  }
}