<template>
  <div id="app">
      <server-info></server-info>
  </div>
</template>

<script>
import ServerInfo from './components/ServerInfo.vue'
export default {
  name: 'App',
  components: {
    ServerInfo
  }
}
</script>

<style lang="scss">
body,html{
    margin:0;
    padding:0;
}
</style>
