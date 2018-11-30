/**
 * @file exigency
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */


import Bluebird from 'bluebird'
import {Store} from './store'
import {TaskRunner} from "./TaskRunner";
import {TaskRunnerParams, TaskRunner2} from "./TaskRunner2";
import {PendingTask, TaskController, TaskTypes} from './TaskController'
import {Task, TaskHandler} from "./TaskHandler";
import {getOr, isFunction, reduce} from 'lodash/fp'

// @ts-ignore
const uncappedReduce = reduce.convert({ 'cap': false });

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

export interface TaskHook {
  (stats: any, requeueData: any) : any
}

interface TaskHooks {
  requeue?: TaskHook,
  failure?: TaskHook
  success?: TaskHook
}

export interface TransitionHook {
  (data: any): any
}

interface TransitionHooks {
  success?: TransitionHook
  failure?: TransitionHook
  start?: TransitionHook
}


const fakeTaskHook = () => {
  return Bluebird.method((stats, requeueData) => {
    return true
  })
}
const fakeTransitionHook = () => {
  return Bluebird.method((data) => {
    return true
  })
}

export class Exigency {

  private tasks: Map<string, TaskHandler>
  private readonly Store: Store
  private readonly Settings: ExigencySettings
  private readonly Logger: ExigencyLogger
  private taskHooks: TaskHooks
  private transitionHooks: TransitionHooks

  constructor(Store: Store, Settings: ExigencySettings, Logger?: ExigencyLogger){
    this.Store = Store
    this.Settings = {
      debugLogging: getOr(false, 'debugLogging', Settings)
    }
    this.Logger = Logger || console
    this.tasks = new Map()

    this.taskHooks = {
      requeue: fakeTaskHook(),
      success: fakeTaskHook(),
      failure: fakeTaskHook()
    }

    this.transitionHooks = {
      success: fakeTransitionHook(),
      failure: fakeTransitionHook(),
      start:   fakeTransitionHook()
    }
  }

  registerTask(task: Task){
    let taskHandler: TaskHandler = new TaskHandler(task)
    return this.tasks.set(taskHandler.getName(), taskHandler)
  }

  runTask(pendingTask: PendingTask): Bluebird<any> {
    let task = new TaskController(pendingTask)
    let handler: TaskHandler = this.tasks.get(task.name)
    let stats
    if(!handler){
      return Bluebird.reject(new Error('No task found with that name'))
    }

    let runData: TaskRunnerParams = {
      taskController: task,
      taskHandler: handler,
      Store: this.Store,
      exigencySettings: this.Settings,
      logger: this.Logger
    }

    return new TaskRunner2(runData).run()
      .then((result) => {
        stats = result[0]
        let hook = this.taskHooks[stats.result]
        if(isFunction(this.taskHooks[stats.result])){
          return this.taskHooks[stats.result](result[0], result[1])
            .then(() => {
              return {ranHook: stats.result, error: null}
            })
            .catch((error) => {
              return {ranHook: stats.result, error: error}
            })
        }
        return Promise.resolve('true')
      })
      .then((result) => {

        return stats
      })
      .catch((error) => {
        return stats
      })
  }

  registerTaskHooks(hooks: TaskHooks){
    let taskHooks = uncappedReduce((acc, item, key) => {
      if(acc[key]){
        if(isFunction(item)) {
          acc[key] = Bluebird.method(item)
        } else {
          throw new Error('Provided Task hooks must be functions...')
        }
      }
      return acc
    }, this.taskHooks, hooks)
    this.taskHooks = taskHooks
  }

  registerTransitionHooks(hooks: TransitionHooks){
    let transitionHooks = uncappedReduce((acc, item, key) => {
      if(acc[key]){
        if(isFunction(item)) {
          acc[key] = Bluebird.method(item)
        } else {
          throw new Error('Provided Transition hooks must be functions...')
        }
      }
      return acc
    }, this.transitionHooks, hooks)
    this.transitionHooks = transitionHooks
  }
}