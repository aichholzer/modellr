module.exports = (grunt) => {
  grunt.initConfig({
    eslint: {
      target: ['./lib/**/*.js'],
      options: { quiet: true }
    }
  });

  grunt.loadNpmTasks('grunt-eslint');

  grunt.registerTask('lint', ['eslint']);
  grunt.registerTask('default', ['eslint']);
};
