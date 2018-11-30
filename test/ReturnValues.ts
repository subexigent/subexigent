import {Exigency, FileStore, MemoryStore, PGStore, Task} from "../src";
import {BasicTask, ResumeSuspended, RetryError} from "../test_mocks/tasks";
import {PgStoreFromEnv} from "../test_mocks/helpers";
import {SimpleResume} from "../test_mocks/tasks/SimpleResume";

/**
 * @file ReturnValues
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */


describe('Success Retry and Error return values.', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  // let localstore: MemoryStore = new MemoryStore()

  let localstore: PGStore = PgStoreFromEnv()
  afterAll(() => {
    localstore.closeStore()
  });

  // test('Success', async () => {
  //   let ex: Exigency = new Exigency(localstore, {debugLogging: false})
  //   let basicTask: Task = BasicTask
  //   let taskData = {
  //     metadata: {
  //       name: 'basicTask',
  //       uuid: null
  //     },
  //     state: {
  //       count: 20
  //     }
  //   }
  //
  //   let expected = {
  //     name: 'basicTask',
  //     transitions: 22,
  //     error: null,
  //     type: 'Fresh',
  //     result: 'success',
  //     retryDelay: 1000
  //   }
  //
  //   ex.registerTask(basicTask)
  //   let result = await ex.runTask(taskData)
  //   expect(result).toEqual(expect.objectContaining(expected))
  // })

  test('Requeue', async () => {
    let ex: Exigency = new Exigency(localstore, {debugLogging: false})
    let simpleResume: Task = SimpleResume
    let taskData = {
      metadata: {
        name: 'SimpleResume',
        uuid: null
      },
      state: {
        ok: true
      }
    }

    let expected = {
      name: 'SimpleResume',
      transitions: 9,
      error: null,
      type: 'Fresh',
      result: 'requeue',
      retryDelay: 1000
    }

    let requeueExpected = {
      name: 'SimpleResume',
      transitions: 22,
      error: null,
      type: 'ResumeSuspended',
      result: 'success',
      retryDelay: 1000
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {
        let result = await ex.runTask(requeueData)

        expect(result).toEqual(expect.objectContaining(requeueExpected))
      }),
      success: jest.fn(async (stats, requeueData) => {

      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }

    ex.registerTaskHooks(taskHooks)
    ex.registerTask(simpleResume)
    let result = await ex.runTask(taskData)
    expect(result).toEqual(expect.objectContaining(expected))
  })

})