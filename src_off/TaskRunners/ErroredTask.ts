/**
 * @file erroredTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Promise from 'bluebird'
import {Runner, TaskHandler, TaskRunner} from "./TaskRunner";
import {Store} from "../store";

export class ErroredTask extends TaskRunner implements Runner {

  transitionCursor: number
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

  private initialize(){

    return this.Store.getLastTransitionError(this.uuid)
      .then((result) => {
        this.cursor = result.transition
        this.initialTransition = result.name
        return this.Store.getState(this.uuid, result.startingState)

      })
      .then((stateResult) => {
        this.State = stateResult.state
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
