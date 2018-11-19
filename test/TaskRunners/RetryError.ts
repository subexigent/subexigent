/**
 * @file RetryError
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Exigency, FileStore, MemoryStore, Task, SimpleMemoryStore, SimpleFileStore} from "../../src";
import {RetryError} from "../../test_mocks/tasks";

describe('Retry Crashed Task', () => {
  let localstore = new SimpleFileStore(`${process.cwd()}/fileStore`)
  // let localstore: SimpleMemoryStore = new SimpleMemoryStore()
  let ex: Exigency = new Exigency(localstore, {debugLogging: false})
  let retryErrorTask: Task = RetryError()

  test('Handles runtime errors correctly.', async () => {

    let taskData = {
      metadata: {
        name: 'retryError',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    ex.registerTask(retryErrorTask)
    let result = await ex.runTask(taskData)

    expect(result.name).toEqual('retryError')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeTruthy()
    expect(result.transitions).toEqual(9)
    expect(result.requeueTask).toBeTruthy()
    expect(result.requeueTask.metadata.name).toEqual(result.name)
    expect(result.requeueTask.metadata.uuid).toEqual(result.uuid)
    expect(result.requeueTask.metadata.error).toBeTruthy()

    let retry = await ex.runTask(result.requeueTask)
    expect(retry.name).toEqual('retryError')
    expect(retry.type).toEqual('ResumeError')
    expect(retry.error).toBeNull()
    expect(retry.transitions).toEqual(23)
    expect(retry.requeueTask).toBeNull()

  }, 1000 * 60 * 5)
})