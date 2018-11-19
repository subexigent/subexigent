/**
 * @file StoreHelpers
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {has, each, isFunction, reduce, first,last,toPairs} from "lodash/fp";
import {TaskUpdate, TransitionUpdate} from "./Store"

// @ts-ignore
const uncappedeach = each.convert({cap: false})

export const reduceObjProps = <T>(data, updates: T) => {
  return reduce((acc, item) => {
    let key: string = first(item)
    let value = last(item)

    if(has(key, acc)){
      if(isFunction(value)){
        let current = acc[key]
        acc[key] = value(current)
      } else {
        acc[key] = value
      }
    }
    return acc
  }, data, toPairs<any>(updates))
}

// export const updateObjectProps = (data, updateData) => {
//   return uncappedeach((v, k) => {
//     if (has(k, data)) {
//       if (isFunction(v)) {
//         let current = data[k]
//         return data[k] = v(current)
//       }
//       data[k] = v
//     }
//   }, updateData)
// }


export const defaultTask = (taskName: string, uuid: string)=> {
  let t = {
    name: taskName,
    uuid: uuid,
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
  return t
}

export const defaultTransition = (transitionName: string, uuid: string, startingStateUUID: string, transitionNumber: number) => {
  let tr = {
    name: transitionName,
    uuid: uuid,
    row: transitionNumber,
    complete: false,
    error: null,
    destination: null,
    wait: null,
    startingState: startingStateUUID,
    endingState: null
  }
  return tr
}

export const pruneTaskRetVal = (rawTask: any) => {
  return {
    name: rawTask.name,
    uuid: rawTask.uuid,
    complete: rawTask.complete,
    suspended: rawTask.suspended,
    error: rawTask.error,
    aborted: rawTask.aborted,
    abortError: rawTask.abortError,
    retryAttempts: rawTask.retryAttempts,
    currentTransition: rawTask.currentTransition,
  }
}