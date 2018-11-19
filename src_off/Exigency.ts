/**
 * @file Exigency
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import Promise from 'bluebird'
import {Store} from "./store"
import {PristineTask,ResumeTask,ErroredTask,TaskHandler, Transition, TaskStats} from "./TaskRunners";

export class Exigency {

  private tasks: Map<string, TaskHandler>
  private readonly Store: Store

  constructor(Store: Store){
    this.Store = Store
    this.tasks = new Map()
  }

  registerTask(taskHandler: TaskHandler){
    this.tasks.set(taskHandler.config.name, taskHandler)
  }



  runTask(taskData: any): Promise<TaskStats>{
    let name = taskData.metadata.name

    if(this.tasks.has(name)){
      let tr
      let task = this.tasks.get(name)
      // if(taskController.metadata.uuid){
      //   return new ResumeTask(task, taskController, this.Store).run()
      // }
      // if(taskController.metadata.uuid && taskController.metadaa.error){
      //   return new ErroredTask(task, taskController, this.Store).run()
      // }

      return new PristineTask(task, taskData, this.Store).run()
    }
  }

}