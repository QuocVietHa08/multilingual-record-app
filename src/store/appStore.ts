import { create } from 'zustand'

interface AppStore {
  recordings: [] 

}

export const useAppStore = create<AppStore>((set, get) => ({
  recordings: [] 
}))

export const appStore = useAppStore.getState
export const setAppStore = useAppStore.setState
