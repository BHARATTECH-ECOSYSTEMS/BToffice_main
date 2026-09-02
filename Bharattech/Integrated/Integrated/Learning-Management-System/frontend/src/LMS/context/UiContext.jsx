import { createContext, useState } from "react";

export const UIContext = createContext()

export const UIContextProvider=({children})=>{
const [collapsed,setCollapsed] = useState(true)

return <UIContext.Provider value={{collapsed,setCollapsed}}>
    {children}
</UIContext.Provider>

}