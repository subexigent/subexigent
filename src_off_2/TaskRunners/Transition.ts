/**
 * @file Transition
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import {TaskData} from "../TaskData";
import {Store} from '../store'
import {TaskHandler} from "../TaskHandler";

export interface TransitionObj {
  to?: string
  initial?: boolean
  wait?: number
  done?: boolean
}

export class Transition {
  taskUuid: string
  transitionFn: Function
  Store: Store

  constructor(taskUuid: string, transitionFn: Function, store: Store) {
    this.taskUuid = taskUuid
    this.transitionFn = transitionFn
    this.Store = store
    console.log(this.transitionFn)
  }
  run(){

  }

  end(){

  }
}

export class TransitionFactory {
  TaskUuid: string
  TaskHandler: TaskHandler
  TaskData: TaskData
  Store: Store

  constructor( taskHandler: TaskHandler, taskData: TaskData, store: Store) {
    this.TaskHandler = taskHandler
    this.TaskData = taskData
    this.Store = store
  }

  createTask(){

  }

  initialize(){
    console.log(this.TaskData)
    return this.Store.findOrCreateTask(this.TaskHandler.getName(), this.TaskData.getUuid())
      .then((data) => {
        console.log(data)
        this.TaskUuid = data.task.uuid
        return new Transition(this.TaskUuid, this.TaskHandler.getInitial() ,this.Store)
      })
  }
}