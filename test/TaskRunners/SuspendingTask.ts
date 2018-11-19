/**
 * @file SuspendingTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Exigency, FileStore, MemoryStore, SimpleFileStore,SimpleMemoryStore,Task} from "../../src";
import {SuspendingTask} from "../../test_mocks/tasks";

describe('Suspending Task', () => {
  let localstore = new SimpleFileStore(`${process.cwd()}/fileStore`)
  // let localstore: SimpleMemoryStore = new SimpleMemoryStore()
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

    ex.registerTask(crashingTask)
    let result = await ex.runTask(taskData)


    expect(result.name).toEqual('suspendingTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toEqual(null)
    expect(result.transitions).toEqual(0)
    expect(result.requeueTask).toBeTruthy()
    expect(result.requeueTask.metadata.name).toEqual(result.name)
    expect(result.requeueTask.metadata.uuid).toEqual(result.uuid)
    expect(result.requeueTask.metadata.error).toBeFalsy()

  })
})