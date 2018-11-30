/**
 * @file SuspendingTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Exigency, FileStore, MemoryStore, Task} from "../../src";
import {SuspendingTask} from "../../test_mocks/tasks";

describe('Suspending Task', () => {
  let localstore = new FileStore(`${process.cwd()}/fileStore`)
  // let localstore: MemoryStore = new MemoryStore()
  let ex: Exigency = new Exigency(localstore, {debugLogging: false})
  let crashingTask: Task = SuspendingTask

  test('Suspends Tasks correctly.', async () => {

    let taskData = {
      metadata: {
        name: 'suspendingTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {

      }),
      success: jest.fn(async (stats, requeueData) => {

      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }
    ex.registerTaskHooks(taskHooks)
    ex.registerTask(crashingTask)
    let result = await ex.runTask(taskData)


    expect(result.name).toEqual('suspendingTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toEqual(null)
    expect(result.transitions).toEqual(0)

  })
})