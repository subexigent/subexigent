/**
 * @file exigency
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */


import Promise from 'bluebird'
import {Store} from './store'
// import {PristineTask,ResumeTask,ErroredTask,TaskHandler, Transition, TaskStats} from "./TaskRunners";
import {TaskData, TaskTypes} from './TaskData'
import {Runner, FreshTask, ResumeSuspended, ResumeError} from "./TaskRunners";
import {TaskRunner} from "./TaskRunners/TaskRunner";
import {Task, TaskHandler} from "./TaskHandler";

// interface TransitionStates {
//   [key: string]: Function
// }
//
// interface TaskConfig {
//   name: string
//   initial: string
//   retryOnError?: boolean
//   retryDelay?: number,
//   rolloffMultiplier?: number,
//   retryAttempts?: number
// }
//
// export interface TaskHandler {
//   config: TaskConfig,
//   states: TransitionStates
// }


export interface TaskStats {
  uuid: string,
  transitions: number,
  error: Error | null,
  handler: string,
  startTime: string,
  endTime: string,
  duration: number
}

export class Exigency {

  private tasks: Map<string, TaskHandler>
  private readonly Store: Store

  constructor(Store: Store){
    this.Store = Store
    this.tasks = new Map()
  }

  registerTask(task: Task){
    let taskHandler: TaskHandler = new TaskHandler(task)
    return this.tasks.set(taskHandler.getName(), taskHandler)
  }



  runTask(taskData: any): any { //Promise<TaskStats>{

    let task = new TaskData(taskData)
    let taskRunner: Runner
    switch (task.getType()) {
      case TaskTypes.Fresh:
        console.log('Fresh')
        taskRunner = new FreshTask(this.tasks.get(task.name), taskData, this.Store)
        break;
      case TaskTypes.ResumeSuspended:
        console.log('Suspended')
        taskRunner = new ResumeSuspended(this.tasks.get(task.name), taskData, this.Store)
        break;
      case TaskTypes.ResumeError:
        console.log('Error')
        taskRunner = new ResumeError(this.tasks.get(task.name), taskData, this.Store)
        break;
      default:
        throw new Error('Could not construct the correct TaskType for this TaskController')
    }


    return taskRunner.run()
  }

}