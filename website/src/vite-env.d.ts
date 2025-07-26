/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

declare module '@mantine/*/styles.css' {
  const content: string
  export default content
}
