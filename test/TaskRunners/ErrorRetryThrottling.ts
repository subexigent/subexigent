import {Exigency, MemoryStore, FileStore, Task, PGStore} from "../../src";
import {CrashingTask} from "../../test_mocks/tasks";
import {PgStoreFromEnv} from "../../test_mocks/helpers";

/**
 * @file ErrorRetryThrottling
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

describe('Repeatedly crashing Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()
  // let localstore: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //   localstore.closeStore()
  // });

  test('Stops attempting to retry runtime errors after count is exceeded', async () => {
    let ex: Exigency = new Exigency(localstore, {debugLogging: false})
    let crashingTask: Task = CrashingTask(2)
    let taskData = {
      metadata: {
        name: 'crashingTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let expectedStats = {
      name: 'crashingTask',
      transitions: 0,
      type: 'Fresh'
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {

        return ex.runTask(requeueData)
      }),
      success: jest.fn(async (stats, requeueData) => {

      }),
      failure: jest.fn(async (stats, requeueData) => {
      })
    }

    ex.registerTaskHooks(taskHooks)
    ex.registerTask(crashingTask)


    let result = await ex.runTask(taskData)
    expect(result).toEqual(expect.objectContaining(expectedStats))
    expect(result.error).toBeTruthy()

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls
    expect(requeueMockCalls.length).toEqual(2)
    expect(failureMockCalls.length).toEqual(1)
    expect(successMockCalls.length).toEqual(0)

    let stats1 = requeueMockCalls[0][0]
    let requeue1 = requeueMockCalls[0][1]
    let stats2 = requeueMockCalls[1][0]
    let requeue2 = requeueMockCalls[1][1]
    expect(stats1).toEqual(expect.objectContaining(expectedStats))
    expect(requeue1.metadata).toEqual(expect.objectContaining({name: 'crashingTask', error: true}))
    // expect(stats2).toEqual(expect.objectContaining({
    //   name: 'crashingTask',
    //   transitions: 1,
    //   type: 'ResumeError'
    // }))
    // expect(requeue2).toBeNull()

  }, 1000 * 60 * 5)

  // test('Stops attempting to retry runtime errors after count is exceeded', async () => {
  //   let ex: Exigency = new Exigency(localstore, {debugLogging: false})
  //   let crashingTask: Task = CrashingTask()
  //   let taskData = {
  //     metadata: {
  //       name: 'crashingTask',
  //       uuid: null
  //     },
  //     state: {
  //       count: 20
  //     }
  //   }
  //
  //   ex.registerTask(crashingTask)
  //   let result = await ex.runTask(taskData)
  //
  //   expect(result.name).toEqual('crashingTask')
  //   expect(result.type).toEqual('Fresh')
  //   expect(result.error).toBeTruthy()
  //   expect(result.transitions).toEqual(0)
  //   expect(result.requeueTask).toBeTruthy()
  //   expect(result.requeueTask.metadata.name).toEqual(result.name)
  //   expect(result.requeueTask.metadata.uuid).toEqual(result.uuid)
  //   expect(result.requeueTask.metadata.error).toBeTruthy()
  //
  //   let retry = await ex.runTask(result.requeueTask)
  //   expect(retry.name).toEqual('crashingTask')
  //   expect(retry.type).toEqual('ResumeError')
  //   expect(retry.error).toBeTruthy()
  //   expect(retry.transitions).toEqual(1)
  //   expect(retry.requeueTask).toBeTruthy()
  //   expect(retry.requeueTask.metadata.name).toEqual(result.name)
  //   expect(retry.requeueTask.metadata.uuid).toEqual(result.uuid)
  //   expect(retry.requeueTask.metadata.error).toBeTruthy()
  //
  //   let retry2 = await ex.runTask(retry.requeueTask)
  //   expect(retry2.name).toEqual('crashingTask')
  //   expect(retry2.type).toEqual('ResumeError')
  //   expect(retry2.error).toBeTruthy()
  //   expect(retry2.transitions).toEqual(2)
  //   expect(retry2.requeueTask).toBeNull()
  // }, 1000 * 60 * 5)
})