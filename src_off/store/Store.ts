/**
 * @file Store
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

interface StoreConstructor {
  new (config: any): Store
}

export interface StoredState {
  uuid: string,
  state: any
}

export interface Store {
  findOrCreateState(taskUuid: string, stateUuid: string, state: any | null)
  createState(taskUuid:string, state: any) : any
  getState(taskUuid: string, stateUuid: string) : any
  createTask(taskName: string) : any
  getTask(taskUuid: string) : any
  closeTask(taskUuid: string) : any
  createTransition(taskUuid: string, transitionName: string, transitionNumber: number, stateUuid: string) : any
  getTransition(taskUuid: string, transitionUuid: string) : any
  getLastTransitionError(taskUuid: string) : any
  closeTransition(taskUuid: string, transitionUuid: string, stateUuid: string, error?: Error) : any
}

