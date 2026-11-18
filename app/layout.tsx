import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata:Metadata={title:'Simran Physiotherapy | Clinic Workspace',description:'Your offline workspace for physiotherapy patient records, appointments and reports.',icons:{icon:'/clinic-icon.svg'}}
export const viewport:Viewport={themeColor:'#087e77',colorScheme:'light'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
