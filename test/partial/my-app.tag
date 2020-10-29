<template>
  <h2>Bird is the ${subject}!</h2>
  <p> Currently running for ${n} seconds</p>
  <style>
    h2 {
      color: #555;
    }
  </style>
  <script>
    this.state = {
      n: 0,
      subject: 'WORD',
    };
    setInterval(() => {
      this.update({
        n: this.state.n + 1,
      });
    }, 1000);
  </script>
</template>
