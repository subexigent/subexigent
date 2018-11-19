/**
 * @file Store
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

// import Promise from 'bluebird'

interface StoreConstructor {
  new (config: any): Store
}

export interface StoredState {
  uuid: string,
  state: any
}

type UpdateProperty<T> = (p: T) => T
type NullUpdateProperty<T> = (p: T | null) => T | null

  // complete: false,
  // suspended: false,
  // error: false,
  // aborted: false,
  // abortError: null,
  // requeueCount: 0,
  // retryAttempts: 0,
  // currentTransition: 0,

export interface TaskUpdate {
  complete?: UpdateProperty<boolean> | boolean
  error?: UpdateProperty<boolean> | boolean
  aborted?: UpdateProperty<boolean> | boolean
  abortError?: NullUpdateProperty<Error> | Error | null
  requeueCount?: UpdateProperty<number> | number
  retryAttempts?: UpdateProperty<number> | number
  currentTransition?: UpdateProperty<number> | number
}

//   Updatable Transition Defaults
//   row: transitionNumber,
//   complete: false,
//   error: null,
//   destination: null,
//   wait: null,
//   endingState: null

export interface TransitionUpdate {
  complete?: UpdateProperty<boolean> | boolean
  error?: NullUpdateProperty<Error> | Error | null
  destination?: NullUpdateProperty<string> | string | null
  wait?: NullUpdateProperty<number> | number | null
  endingState?: NullUpdateProperty<string> | string | null
}

export interface SimpleStore {
  createTask(taskName: string)
  getTask(taskUuid: string, allData?: boolean)
  updateTask(taskUuid: string, updateData: TaskUpdate)
  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number)
  getTransition(taskUuid: string, transitionUuid: string)
  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate)
  findTransition(taskUuid: string, position: number)
  createState(taskUuid:string, state: any)
  getState(taskUuid: string, stateUuid: string)
}

export interface Store {
  findOrCreateState(taskUuid: string, stateUuid: string, state: any | null)
  createState(taskUuid:string, state: any) : any
  getState(taskUuid: string, stateUuid: string) : any
  findOrCreateTask(taskName: string, taskUuid?: string) : Promise<any>
  createTask(taskName: string) : any
  getTask(taskUuid: string, allData?: boolean) : any
  closeTask(taskUuid: string) : any
  suspendTask(taskUuid: string, error?: Error | null) : any
  updateTask(taskUuid: string, updateData: TaskUpdate) : any
  createTransition(taskUuid: string, transitionName: string, transitionNumber: number, stateUuid: string) : any
  getTransition(taskUuid: string, transitionUuid: string) : any
  getLastTransition(taskUuid: string) : any
  closeTransition(taskUuid: string, transitionUuid: string, stateUuid: string, transitionDestination: any,error?: Error) : any
  completeTransition(taskUuid: string, transitionUuid: string) : any
}

