/**
 * @file RetryError
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Exigency, FileStore, MemoryStore, SimpleFileStore, SimpleMemoryStore,Task} from "../../src";
import {ResumeSuspended} from "../../test_mocks/tasks";

describe('Retry Crashed Task', () => {
  let localstore = new SimpleFileStore(`${process.cwd()}/fileStore`)
  // let localstore: SimpleMemoryStore = new SimpleMemoryStore()
  let ex: Exigency = new Exigency(localstore, {debugLogging: false})
  let resumeSuspendedTask: Task = ResumeSuspended()

  test('Handles runtime errors correctly.', async () => {

    let taskData = {
      metadata: {
        name: 'resumeSuspended',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    ex.registerTask(resumeSuspendedTask)
    let result = await ex.runTask(taskData)

    expect(result.name).toEqual('resumeSuspended')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeFalsy()
    expect(result.transitions).toEqual(9)
    expect(result.requeueTask).toBeTruthy()
    expect(result.requeueTask.metadata.name).toEqual(result.name)
    expect(result.requeueTask.metadata.uuid).toEqual(result.uuid)
    expect(result.requeueTask.metadata.error).toBeFalsy()

    let retry = await ex.runTask(result.requeueTask)
    expect(retry.name).toEqual('resumeSuspended')
    expect(retry.type).toEqual('ResumeSuspended')
    expect(retry.error).toBeNull()
    expect(retry.transitions).toEqual(23)
    expect(retry.requeueTask).toBeNull()

  }, 1000 * 60 * 5)
})