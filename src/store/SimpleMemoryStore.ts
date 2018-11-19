/**
 * @file SimpleMemoryStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

// import Bluebird from 'bluebird'
import {Store, SimpleStore, TaskUpdate, TransitionUpdate} from "./Store"
import {defaultTask, defaultTransition, pruneTaskRetVal, updateObjectProps, reduceObjProps} from "./StoreHelpers"
import {v4} from 'uuid'
import {sortBy, filter, first, last, has, each, find} from "lodash/fp";

// @ts-ignore
const uncappedeach = each.convert({cap: false})

export class SimpleMemoryStore implements SimpleStore {

  private Tasks: Map<string, any>

  constructor() {
    this.Tasks = new Map()
  }

  createTask(taskName: string) {
    let uuid = v4()
    let t = defaultTask(taskName, uuid)
    this.Tasks.set(uuid, t)
    return Promise.resolve(t)
  }

  getTask(taskUuid: string, allData?: boolean) {
    let task = this.Tasks.get(taskUuid)
    let retVal = allData ? task : pruneTaskRetVal(task)
    return Promise.resolve(retVal)
  }

  updateTask(taskUuid: string, updateData: TaskUpdate) {
    return this.getTask(taskUuid, true)
      .then((data) => {
        data = reduceObjProps<TaskUpdate>(data, updateData)
        return Promise.resolve(data)
      })
  }

  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number) {
    let uuid = v4()
    let tr = defaultTransition(transitionName, uuid, stateUuid, transitionNumber)

    let task = this.Tasks.get(taskUuid)
    task.currentTransition = transitionNumber
    task.transitions[uuid] = tr
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(tr)
  }

  getTransition(taskUuid: string, transitionUuid: string) {
    let task = this.Tasks.get(taskUuid)
    let transition = task.transitions[transitionUuid]
    return Promise.resolve(transition)
  }

  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate) {
    return this.getTransition(taskUuid, transitionUuid)
      .then((data) => {
        data = reduceObjProps<TransitionUpdate>(data, updateData)
        return data
      })
  }

  findTransition(taskUuid: string, position: number){
    let task = this.Tasks.get(taskUuid)
    let tr = find({row: position}, task.transitions) || null
    return Promise.resolve(tr)
  }

  createState(taskUuid: string, state: any) {
    let uuid = v4()

    let stateObj = {
      uuid: uuid,
      state: state
    }

    let task = this.Tasks.get(taskUuid)
    task.states[uuid] = stateObj
    return Promise.resolve(stateObj)
  }

  getState(taskUuid: string, stateUuid: string) {
    let task = this.Tasks.get(taskUuid)
    return Promise.resolve(task.states[stateUuid])
  }
}