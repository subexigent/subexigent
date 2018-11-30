/**
 * @file RetryError
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Exigency, FileStore, MemoryStore, PGStore, Task} from "../../src";
import {ResumeSuspended} from "../../test_mocks/tasks";
import {PgStoreFromEnv} from "../../test_mocks/helpers";

describe('Retry Crashed Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  // let localstore: MemoryStore = new MemoryStore()

  let localstore: PGStore = PgStoreFromEnv()
  afterAll(() => {
    localstore.closeStore()
  });

  let ex: Exigency = new Exigency(localstore, {debugLogging: false})
  let resumeSuspendedTask: Task = ResumeSuspended()

  test('Handles runtime errors correctly.', async () => {

    let taskData = {
      metadata: {
        name: 'SimpleResume',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {
        await ex.runTask(requeueData)
      }),
      success: jest.fn(async (stats, requeueData) => {

      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }
    ex.registerTaskHooks(taskHooks)
    ex.registerTask(resumeSuspendedTask)


    let result = await ex.runTask(taskData)

    expect(result.name).toEqual('resumeSuspended')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeFalsy()
    expect(result.transitions).toEqual(9)

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls

    expect(requeueMockCalls.length).toEqual(1)
    expect(failureMockCalls.length).toEqual(0)
    expect(successMockCalls.length).toEqual(1)

  }, 1000 * 60 * 5)
})