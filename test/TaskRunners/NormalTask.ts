/**
 * @file NormalTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import {PgStoreFromEnv} from "../../test_mocks/helpers";
import {Exigency, FileStore, MemoryStore, PGStore,Task} from "../../src";
import {BasicTask} from "../../test_mocks/tasks";

describe('Working Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()

  // let localstore: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //     localstore.closeStore()
  // });

  let ex: Exigency = new Exigency(localstore, {debugLogging: false})
  let basicTask: Task = BasicTask

  test('Runs task to completion.', async () => {

    let taskData = {
      metadata: {
        name: 'basicTask',
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
    ex.registerTask(basicTask)

    let result = await ex.runTask(taskData)

    expect(result.name).toEqual('basicTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toEqual(null)
    expect(result.transitions).toEqual(22)

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls

    expect(requeueMockCalls.length).toEqual(0)
    expect(failureMockCalls.length).toEqual(0)
    expect(successMockCalls.length).toEqual(1)
  })
})