/**
 * @file SimpleMemoryStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {SimpleMemoryStore} from "../src/store/SimpleMemoryStore";
import {SimpleFileStore} from "../src/store/SimpleFileStore";
import {map} from 'lodash/fp'
import {SimpleStore} from "../src/store";
import get = Reflect.get;

const TestStorage = [
  new SimpleMemoryStore(),
  new SimpleFileStore(`${process.cwd()}/fileStore`)
]

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
  states: {},
  transitions: {}
}

let defaultTransition = {
  name: 'doWork',
  row: 1,
  complete: false,
  error: null,
  destination: null,
  wait: null,
  endingState: null
}

describe('Storage Interfaces', () => {
  map((store: SimpleStore) => {
    test(`${store.constructor.name}`, async () => {

      let createTask = await store.createTask('MyTask')
      expect(createTask).toEqual(expect.objectContaining(defaultTask))

      let getTask = await store.getTask(createTask.uuid, true)
      expect(getTask).toEqual(expect.objectContaining(defaultTask))

      // @ts-ignore - Needed to test proper function
      let updateTask = await store.updateTask(createTask.uuid, {complete: true, currentTransition: count => count + 1, bob: true})
      expect(updateTask).toEqual(expect.objectContaining({complete: true, currentTransition: 1}))

      let taskMetaOnly = await store.getTask(createTask.uuid)
      expect(taskMetaOnly).not.toEqual(expect.objectContaining({states: {}, transitions: {}}))

      let createState = await store.createState(createTask.uuid, {count: 10})
      expect(createState).toEqual(expect.objectContaining({state:{count: 10}}))

      let getState = await store.getState(createTask.uuid, createState.uuid)
      expect(getState).toEqual(expect.objectContaining(createState))

      let createTransition = await store.createTransition(createTask.uuid,'doWork', createState.uuid, 1)
      expect(createTransition).toEqual(expect.objectContaining(defaultTransition))

      let getTransition = await store.getTransition(createTask.uuid, createTransition.uuid)
      expect(getTransition).toEqual(expect.objectContaining(createTransition))

      // @ts-ignore - Needed to test proper function
      let updateTransition = await store.updateTransition(createTask.uuid, createTransition.uuid, {destination: (name) => 'bob', complete: true, bob: true})
      expect(updateTransition).toEqual(expect.objectContaining({destination: 'bob', complete: true}))

      let getUpdatedTransition = await store.getTransition(createTask.uuid, createTransition.uuid)
      expect(getUpdatedTransition).toEqual(expect.objectContaining({destination: 'bob', complete: true}))

      let findTransition = await store.findTransition(createTask.uuid, 1)
      expect(findTransition).toEqual(expect.objectContaining(getUpdatedTransition))

      let nofindTransition = await store.findTransition(createTask.uuid, 2)
      expect(nofindTransition).toBeNull()
    })
  }, TestStorage)

})