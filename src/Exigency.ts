/**
 * @file exigency
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */


import Bluebird from 'bluebird'
import {Store, SimpleStore} from './store'
import {TaskRunner} from "./TaskRunner";
import {PendingTask, TaskController, TaskTypes} from './TaskController'
import {Task, TaskHandler} from "./TaskHandler";
import {getOr} from 'lodash/fp'



export interface TaskStats {
  uuid: string,
  transitions: number,
  error: Error | null,
  handler: string
}

export interface ExigencyLogger {
  log: Function,
  warn: Function,
  info: Function,
  error: Function
}

export interface ExigencySettings {
  debugLogging?: boolean
}

export class Exigency {

  private tasks: Map<string, TaskHandler>
  private readonly Store: SimpleStore
  private readonly Settings: ExigencySettings
  private readonly Logger: ExigencyLogger
  private requeueHookFn: Function
  private successHookFn: Function

  constructor(Store: SimpleStore, Settings: ExigencySettings, Logger?: ExigencyLogger){
    this.Store = Store
    this.Settings = {
      debugLogging: getOr(false, 'debugLogging', Settings)
    }
    this.Logger = Logger || console
    this.tasks = new Map()
    this.successHookFn = (results) => {
      return results
    }
    this.requeueHookFn = (results) => {
      return results
    }
  }

  registerTask(task: Task){
    let taskHandler: TaskHandler = new TaskHandler(task)
    return this.tasks.set(taskHandler.getName(), taskHandler)
  }

  runTask(pendingTask: PendingTask): Bluebird<any> {
    let task = new TaskController(pendingTask)
    let handler: TaskHandler = this.tasks.get(task.name)

    if(!handler){
      return Bluebird.reject(new Error('No task found with that name'))
    }

    return new TaskRunner(task, handler, this.Store, this.Settings, this.Logger).run()
      .then((result) => {
        if(result.requeueTask){
          return this.requeueHookFn(result)
        }
        return this.successHookFn(result)
      })
  }

  successHook(hookFn: Function){
    this.successHookFn = hookFn
  }

  requeueHook(hookFn: Function){
    this.requeueHookFn = hookFn
  }
}