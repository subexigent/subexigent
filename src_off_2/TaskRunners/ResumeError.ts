/**
 * @file ResumeError
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {TaskRunner, Runner} from "./TaskRunner";
import {TaskHandler} from "../TaskHandler";
import {TaskData} from "../TaskData";
import {Store} from "../store";
import Promise from "bluebird";


export class ResumeError extends TaskRunner implements Runner {
  constructor(taskHandler: TaskHandler, taskData: TaskData, store: Store) {
    super(taskHandler, taskData, store);
  }
  run(): Promise<any>{
    return this.initialize()
      .catch((err) => {

      })
  }
  initialize(){
    console.log(this)
    return Promise.resolve(true)
  }
}