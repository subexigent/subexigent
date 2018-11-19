import {Exigency, MemoryStore, FileStore, Task, SimpleFileStore, SimpleMemoryStore} from "../../src";
import {CrashingTask} from "../../test_mocks/tasks";

/**
 * @file ErrorRetryThrottling
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

describe('Repeatedly crashing Task', () => {
  let localstore = new SimpleFileStore(`${process.cwd()}/fileStore`)
  // let localstore: SimpleMemoryStore = new SimpleMemoryStore()
  let ex: Exigency = new Exigency(localstore, {debugLogging: false})

  test('Stops attempting to retry runtime errors after count is exceeded', async () => {
    let crashingTask: Task = CrashingTask()
    let taskData = {
      metadata: {
        name: 'crashingTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    ex.registerTask(crashingTask)
    let result = await ex.runTask(taskData)

    expect(result.name).toEqual('crashingTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeTruthy()
    expect(result.transitions).toEqual(0)
    expect(result.requeueTask).toBeTruthy()
    expect(result.requeueTask.metadata.name).toEqual(result.name)
    expect(result.requeueTask.metadata.uuid).toEqual(result.uuid)
    expect(result.requeueTask.metadata.error).toBeTruthy()

    let retry = await ex.runTask(result.requeueTask)
    expect(retry.name).toEqual('crashingTask')
    expect(retry.type).toEqual('ResumeError')
    expect(retry.error).toBeTruthy()
    expect(retry.transitions).toEqual(1)
    expect(retry.requeueTask).toBeTruthy()
    expect(retry.requeueTask.metadata.name).toEqual(result.name)
    expect(retry.requeueTask.metadata.uuid).toEqual(result.uuid)
    expect(retry.requeueTask.metadata.error).toBeTruthy()

    let retry2 = await ex.runTask(retry.requeueTask)
    expect(retry2.name).toEqual('crashingTask')
    expect(retry2.type).toEqual('ResumeError')
    expect(retry2.error).toBeTruthy()
    expect(retry2.transitions).toEqual(2)
    expect(retry2.requeueTask).toBeNull()
  }, 1000 * 60 * 5)

  test('Stops attempting to retry runtime errors after count is exceeded', async () => {
    let crashingTask: Task = CrashingTask()
    let taskData = {
      metadata: {
        name: 'crashingTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    ex.registerTask(crashingTask)
    let result = await ex.runTask(taskData)

    expect(result.name).toEqual('crashingTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeTruthy()
    expect(result.transitions).toEqual(0)
    expect(result.requeueTask).toBeTruthy()
    expect(result.requeueTask.metadata.name).toEqual(result.name)
    expect(result.requeueTask.metadata.uuid).toEqual(result.uuid)
    expect(result.requeueTask.metadata.error).toBeTruthy()

    let retry = await ex.runTask(result.requeueTask)
    expect(retry.name).toEqual('crashingTask')
    expect(retry.type).toEqual('ResumeError')
    expect(retry.error).toBeTruthy()
    expect(retry.transitions).toEqual(1)
    expect(retry.requeueTask).toBeTruthy()
    expect(retry.requeueTask.metadata.name).toEqual(result.name)
    expect(retry.requeueTask.metadata.uuid).toEqual(result.uuid)
    expect(retry.requeueTask.metadata.error).toBeTruthy()

    let retry2 = await ex.runTask(retry.requeueTask)
    expect(retry2.name).toEqual('crashingTask')
    expect(retry2.type).toEqual('ResumeError')
    expect(retry2.error).toBeTruthy()
    expect(retry2.transitions).toEqual(2)
    expect(retry2.requeueTask).toBeNull()
  }, 1000 * 60 * 5)
})