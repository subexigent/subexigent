/**
 * @file RetryError
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Exigency, MemoryStore, FileStore, Task, PGStore} from "../../src";
import {RetryError} from "../../test_mocks/tasks";
import {PgStoreFromEnv} from "../../test_mocks/helpers";

describe('Retry Crashed Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()

  // let localstore: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //   localstore.closeStore()
  // });

  test('Handles runtime errors correctly.', async () => {
    let ex: Exigency = new Exigency(localstore, {debugLogging: false})
    let retryErrorTask: Task = RetryError()
    let taskData = {
      metadata: {
        name: 'retryError',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {
        let retry = await ex.runTask(requeueData)
        expect(retry.name).toEqual('retryError')
        expect(retry.type).toEqual('ResumeError')
        expect(retry.error).toBeNull()
        expect(retry.transitions).toEqual(23)
      }),
      success: jest.fn(async (stats, requeueData) => {
        expect(stats.name).toEqual('retryError')
        expect(stats.type).toEqual('ResumeError')
        expect(stats.error).toBeNull()
        expect(stats.transitions).toEqual(23)
      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }
    ex.registerTaskHooks(taskHooks)
    ex.registerTask(retryErrorTask)
    ex.runTask(taskData)

  })
  test('Throwing in a hook is bad.', async () => {
    let ex: Exigency = new Exigency(localstore, {debugLogging: false})
    let retryErrorTask: Task = RetryError()
    let taskData = {
      metadata: {
        name: 'retryError',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn((stats, requeueData) => {
        throw new Error('Oops.')
      }),
      success: jest.fn((stats, requeueData) => {
      }),
      failure: jest.fn((stats, requeueData) => {

      })
    }
    ex.registerTaskHooks(taskHooks)
    ex.registerTask(retryErrorTask)


    let result = await ex.runTask(taskData)
    console.log(result)

    expect(taskHooks.requeue.mock.calls.length).toEqual(1)
    expect(taskHooks.requeue.mock.results[0].isThrow).toBeTruthy()


    expect(result.name).toEqual('retryError')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeTruthy()
    expect(result.transitions).toEqual(9)
  })
})