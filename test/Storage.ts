/**
 * @file Storage
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {map} from 'lodash/fp'
import {Store, MemoryStore, FileStore} from "../src";
const TestStorage = [
  new MemoryStore(),
  new FileStore(`${process.cwd()}/fileStore`)
]

describe('File and Memory Storage basic usage', () => {

  map((store: Store) => {
    test(`${store.constructor.name} conformity`, async () => {
      let transitionNumber = 0

      // Create the new state
      let task = await store.findOrCreateTask('bob')
      let taskuuid = task.task.uuid
      expect(taskuuid).toBeTruthy()
      expect(task.created).toBeTruthy()

      //Find that same state via its uuid.
      let foundtask = await store.findOrCreateTask('bob', taskuuid)
      expect(foundtask.task.uuid).toEqual(taskuuid)
      expect(foundtask.created).toBeFalsy()

      // Create the initial state object on the new Task.
      let initialStateData = await store.createState(taskuuid, {ok: 1})
      let foundNotCreated = await store.findOrCreateState(taskuuid, initialStateData.uuid, null)
      expect(foundNotCreated).toMatchObject(initialStateData)

      // Create the Initial transition
      let transitionuuid1 = await store.createTransition(taskuuid, 'bob',transitionNumber++, initialStateData.uuid)

      // Create the closing state object/initial state object for the next transition.
      let endingStateData = await store.findOrCreateState(taskuuid, null, {ok: 2})

      await store.closeTransition(taskuuid, transitionuuid1, endingStateData.uuid, {to: 'someTransition'}, null)

      let closedTransition1 = await store.getTransition(taskuuid, transitionuuid1)
      expect(closedTransition1.complete).toBeTruthy()
      expect(closedTransition1.startingState).toEqual(initialStateData.uuid)
      expect(closedTransition1.endingState).toEqual(endingStateData.uuid)

      // Inspect our state objects
      let startStateData = await store.getState(taskuuid, initialStateData.uuid)
      expect(startStateData.uuid).toEqual(initialStateData.uuid)

      let transitionuuid2 = await store.createTransition(taskuuid, 'bob',transitionNumber++, endingStateData.uuid)
      let transition2EndStateData = await store.createState(taskuuid, {ok: 3})
      await store.closeTransition(taskuuid, transitionuuid2, transition2EndStateData.uuid,{to: 'someTransition'}, null)
      let closedTransition2 = await store.getTransition(taskuuid, transitionuuid2)
      expect(closedTransition2.startingState).toEqual(endingStateData.uuid)
      expect(closedTransition2.endingState).toEqual(transition2EndStateData.uuid)


      let transitionuuid3 = await store.createTransition(taskuuid, 'bob', transitionNumber++, transition2EndStateData.uuid)
      await store.closeTransition(taskuuid, transitionuuid3, transition2EndStateData.uuid, new Error('This broke somehow'))
      let closedTransition3 = await store.getTransition(taskuuid, transitionuuid3)
      expect(closedTransition3.startingState).toEqual(transition2EndStateData.uuid)
      expect(closedTransition3.endingState).toEqual(transition2EndStateData.uuid)

      // Close the task
      await store.closeTask(taskuuid)

      let completeTask = await store.getTask(taskuuid)
      expect(completeTask.complete).toBeTruthy()
    })

    // test(`${store.constructor.name} findOrCreate`, async () => {
    //   let taskuuid = await store.createTask('bob')
    //   expect(taskuuid).toBeTruthy()
    //
    //   let initialStateData = await store.createState(taskuuid, {ok: 1})
    //   let foundNotCreated = await store.findOrCreateState(taskuuid, initialStateData.uuid, null)
    // })
  }, TestStorage)

  test('Return Value Idempotency', async() => {
    map(async (store: Store) => {
      let a = await store.createTask('bob')
      let b = await store.getTask(a.uuid)
      expect(a).toEqual(b)
    }, TestStorage)
  })
})
