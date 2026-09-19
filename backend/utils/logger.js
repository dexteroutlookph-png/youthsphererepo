const formatArgs = (level, args) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (args.length === 0) {
    return console.log(prefix);
  }

  const [first, ...rest] = args;
  if (typeof first === 'string') {
    console.log(prefix, first, ...rest);
    return;
  }

  console.log(prefix, ...args);
};

const logger = {
  info: (...args) => formatArgs('info', args),
  warn: (...args) => formatArgs('warn', args),
  error: (...args) => formatArgs('error', args),
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      formatArgs('debug', args);
    }
  }
};

module.exports = logger;