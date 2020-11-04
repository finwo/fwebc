<template>
  <h2>Bird is the ${subject}!</h2>
  <p> Currently running for ${n} seconds</p>
  <ul>
    ${Array(5).fill(0).map((a,i) => `
      <li>I'm item ${i}</li>
    `).join('')}
  </ul>
</template>
<style>
  h2 {
    color: #555;
  }
</style>
<script>
  this.state = {
    n      : 0,
    subject: 'word',
  };
  setInterval(() => {
    this.state.n++;
  }, 1000);
</script>
