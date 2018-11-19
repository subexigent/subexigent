/**
 * @file SuspendingTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task} from "../../src"

export const SuspendingTask: Task = {
  config: {
    name: 'suspendingTask',
    initial: 'doWork',
    retryAttempts: 1
  },
  states: {
    doWork: (State,taskController) => {
      return [{to: 'doWork', requeue: true}, State]
    }
  }
}