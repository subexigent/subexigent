/**
 * @file PristineTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Promise from 'bluebird'
import {Runner, TaskHandler, TaskRunner} from "./TaskRunner";
import {Store} from "../store";

export class PristineTask extends TaskRunner implements Runner {

  transitionCursor: number
  initialTransition: string
  uuid: string

  constructor(taskHandler: TaskHandler, taskData: any, Store: Store) {
    super(taskHandler, taskData, Store);
    this.transitionCursor = 0
    this.initialTransition = taskHandler.config.initial
  }

  run(): Promise<any> {
    return this.initialize()
      .catch((err) => {
        console.log(err)
        throw err
      })
  }

  private initialize(){
    return this.Store.createTask(this.taskName)
      .then((uuid: string) => {
        this.uuid = uuid
        this.metadata.uuid = uuid
        let transition = {to: this.initialTransition}
        return this.transition(transition)
      })
      .then((result) => {
        return this.Store.closeTask(this.metadata.uuid)
          .then(() => {
            return result
          })
      })
  }
}