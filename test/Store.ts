/**
 * @file MemoryStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {MemoryStore} from "../src/store/MemoryStore";
import {FileStore} from "../src/store/FileStore";
import {map} from 'lodash/fp'
import {Store} from "../src/store";
import {hasEnvs, PgStoreFromEnv} from "../test_mocks/helpers";
import {UTCNow} from "../src/store/StoreHelpers";

const TestStorage: Store[] = [
  new MemoryStore(),
  new FileStore(`${process.cwd()}/fileStore`),
]

if(hasEnvs()){
  TestStorage.push(PgStoreFromEnv())
}

let defaultTask = {
  name: 'MyTask',
  complete: false,
  suspended: false,
  error: false,
  aborted: false,
  abortError: null,
  requeueCount: 0,
  retryAttempts: 0,
  currentTransition: 0,
  // states: {},
  // transitions: {}
}

let defaultTransition = {
  name: 'doWork',
  ordinal: 1,
  complete: false,
  error: null,
  destination: null,
  wait: null,
  endingState: null
}

afterAll(() => {
  if (TestStorage.length === 3) {
    TestStorage[2].closeStore()
  }
});

describe('Storage Interfaces', () => {
  map((store: Store) => {
    test(`${store.constructor.name}`, async () => {

      let createTask = await store.createTask({name: 'MyTask', retriesRemaining: 5})
      expect(createTask.created_at).toBeTruthy()
      expect(createTask.ended_at).toBeFalsy()
      expect(createTask.created_at).toEqual(createTask.updated_at)
      expect(createTask).toEqual(expect.objectContaining(defaultTask))

      let getTask = await store.getTask(createTask.uuid, true)
      expect(getTask.created_at).toBeTruthy()
      expect(getTask.ended_at).toBeFalsy()
      expect(getTask.created_at).toEqual(getTask.updated_at)
      expect(getTask).toEqual(expect.objectContaining(defaultTask))

      // @ts-ignore - Needed to test proper function
      let updateTask = await store.updateTask(createTask.uuid, {
        complete: true,
        currentTransition: count => count + 1,
        // @ts-ignore - Needed to test proper function
        bob: true
      })

      expect(updateTask.created_at).toBeTruthy()
      expect(updateTask.ended_at).toBeFalsy()
      expect(updateTask.created_at).not.toEqual(updateTask.updated_at)
      expect(updateTask).toEqual(expect.objectContaining({complete: true, currentTransition: 1}))

      let taskMetaOnly = await store.getTask(createTask.uuid)
      expect(taskMetaOnly).not.toEqual(expect.objectContaining({states: {}, transitions: {}}))

      let createState = await store.createState(createTask.uuid, {count: 10})
      expect(createState.created_at).toBeTruthy()
      expect(createState.created_at).toEqual(createState.updated_at)
      expect(createState).toEqual(expect.objectContaining({state: {count: 10}}))

      let getState = await store.getState(createTask.uuid, createState.uuid)
      expect(getState).toEqual(expect.objectContaining(createState))

      let createTransition = await store.createTransition(createTask.uuid, 'doWork', createState.uuid, 1)
      expect(createTransition).toEqual(expect.objectContaining(defaultTransition))

      let getTransition = await store.getTransition(createTask.uuid, createTransition.uuid)
      expect(getTransition).toEqual(expect.objectContaining(createTransition))

      // @ts-ignore - Needed to test proper function
      let updateTransition = await store.updateTransition(createTask.uuid, createTransition.uuid, {
        destination: (name) => 'bob',
        complete: true,
        ended_at: UTCNow(),
        // @ts-ignore - Needed to test proper function
        bob: true
      })

      expect(updateTransition.ended_at).toBeTruthy()
      expect(updateTransition).toEqual(expect.objectContaining({destination: 'bob', complete: true}))

      let getUpdatedTransition = await store.getTransition(createTask.uuid, createTransition.uuid)
      expect(getUpdatedTransition).toEqual(expect.objectContaining({destination: 'bob', complete: true, ended_at: updateTransition.ended_at}))

      let findTransition = await store.findTransition(createTask.uuid, 1)
      expect(findTransition).toEqual(expect.objectContaining(getUpdatedTransition))

      let nofindTransition = await store.findTransition(createTask.uuid, 2)
      expect(nofindTransition).toBeNull()

      let endedTask = await store.updateTask(createTask.uuid, {ended_at: UTCNow()})
      expect(endedTask.ended_at).toBeTruthy()
    })
  }, TestStorage)

})