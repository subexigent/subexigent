/**
 * @file NormalTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Exigency, FileStore, MemoryStore, Task, SimpleFileStore, SimpleMemoryStore} from "../../src";
import {BasicTask} from "../../test_mocks/tasks";

describe('Working Task', () => {
  let localstore = new SimpleFileStore(`${process.cwd()}/fileStore`)
  // let localstore: SimpleMemoryStore = new SimpleMemoryStore()
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

    ex.registerTask(basicTask)
    let result = await ex.runTask(taskData)

    expect(result.name).toEqual('basicTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toEqual(null)
    expect(result.transitions).toEqual(22)
    expect(result.requeueTask).toEqual(null)
  })
})