/**
 * @file FreshTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Promise from 'bluebird'
import {TaskRunner, Runner} from "./TaskRunner";
import {TaskHandler} from "../TaskHandler";
import {TaskData} from "../TaskData";
import {Store} from "../store";
import {Transition} from './Transition'



export class FreshTask extends TaskRunner implements Runner {
  constructor(taskHandler: TaskHandler, taskData: TaskData, store: Store) {
    super(taskHandler, taskData, store);
  }
  run(): Promise<any>{
    return this.initialize()
      .catch((err) => {

      })
  }
  initialize(){
    this.previousTransition = null
    return this.TransitionFactory.initialize()
      .then((transition) => {
        console.log(transition)
        return this.transition(transition)
      })

    // return this.Store.createTask(this.TaskHandler.getName())
    //   .then((uuid: string) => {
    //     let transition: Transition = this.TransitionFactory.create({initial: true})
    //     console.log(transition)
    //     return this.transition(transition)
    //   })

  }
}