/**
 * @file CrashingTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task} from "../../src"

export const CrashingTask = (retries = 1): Task => {
  return {
    config: {
      name: 'crashingTask',
      initial: 'doWork',
      retryLimit: retries,
      retryDelay: 1000
    },
    states: {
      doWork: (State,taskController) => {
        throw new Error('derp')
      }
    }
  }
}