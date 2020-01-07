const chalk = require('chalk');
const vueDocs = require('vue-docgen-api');

function paramsString(params) {
  return params.map(param => `${param.name}: \`${param.type.name}\``).join(',');
}

function generateTags({ tags }) {
  if (tags && Object.keys(tags).length) {
    let tagsContent = '::: tip Tags\n';

    tagsContent += Object.keys(tags)
      .map(key => tags[key].map(tag => `**${tag.title}**: ${tag.description}<br />`).join(''))
      .join('');

    return tagsContent + '\n:::\n';
  }

  return '';
}

function fileContent() {
  let contentArray = [];
  let line = 0;

  return {
    get content() {
      return contentArray.join('\n');
    },
    addline(content) {
      contentArray[line] = content;
      line++;
    }
  };
}

function camelToSnake(string) {
    return string.replace(/[\w]([A-Z])/g, function(m) {
        return m[0] + "-" + m[1];
    }).toLowerCase();
}

module.exports = async path => {
  const errors = [];
  const file = fileContent();

  try {
    const data = await vueDocs.parse(path, {
        alias: {
            '~': __dirname + '/../../../../app/',
        },
    });

    file.addline(`# ${data.displayName}\n${data.description}\n`);

    // Tags
    file.addline(generateTags(data));

    if (data.methods && data.methods.length || data.events && data.events.length) {
        file.addline('[[toc]]\n');
    }

    // Example
    let exampleContent = '## Example\n\n';
    exampleContent += `<pre><code>&lt;${data.displayName}`;

    // Props
    let propsContent = '## Props\n\n';
    if (data.props) {
      const props = data.props;
      propsContent += '|Name|Description|Type|Default|\n|:-|:-|:-|:-|\n';

      props.forEach(prop => {
        prop.type.name = prop.type.name.replace('|', ', ');

        propsContent += `|${prop.name}|${prop.description}|${prop.type.name}|`;
        exampleContent += '\n&nbsp;&nbsp;&nbsp;&nbsp;';
        if (prop.type.name !== 'string') {
            exampleContent += ':';
        }
        exampleContent += `${camelToSnake(prop.name)}="`;

        if (prop.defaultValue && prop.defaultValue.value.startsWith('function')) {
          const returnValue = prop.defaultValue.value.split('return ')[1].split(';')[0];
          propsContent += returnValue;
          exampleContent += returnValue;
        } else {
          propsContent += `${prop.defaultValue ? prop.defaultValue.value.replace(/\n/g, '') : '-'}`;
          if (prop.defaultValue && prop.defaultValue.value !== 'null') {
            exampleContent += prop.defaultValue.value;
          }
        }

        exampleContent += '"';

        propsContent += `|\n`;
      });
    }

    exampleContent += '\n/&gt;</code></pre>';

    file.addline(exampleContent);

    if (data.props) {
        file.addline(propsContent + '\n');
    }

    //Methods
    if (data.methods) {
      const methods = data.methods;
      file.addline('## Methods\n');

      methods.forEach(method => {
        let line = `### ${method.name} `;
        if (method.params) {
            line += `(${paramsString(method.params)})`;
        }
        if (!method.returns) {
          errors.push(`Missing method return type for ${method.name} in ${data.displayName}`);
        } else {
          line += ` -> ${method.returns.type.name}\n `;
        }
        line += `${
          method.description
        }\n`;

        file.addline(line);

        // params
        if (method.params) {
          file.addline(
            `#### Params\n| name | type | description\n|:-|:-|:-|\n` +
              method.params.map(param => `|${param.name}|\`${param.type.name}\`|${param.description}`).join('\n')
          );
        }

        // returns
        if (method.returns) {
          file.addline(`\n#### returns (${method.returns.type.name})\n ${method.returns.description}`);
        }
      });
    }

    // Slots
    if (data.slots) {
      const slots = data.slots;
      file.addline('## Slots\n');

      file.addline(`${slots.map(slot => `### ${slot.name}\n${slot.description}`).join('\n')}\n\n`);
    }

    // Events
    if (data.events) {
      const events = data.events;
      let eventsContent = '## Events\n\n';
      eventsContent += '|Name|Description|Type|\n|:-|:-|:-|\n';

      events.forEach(event => {
        eventsContent += `|${event.name}|${event.description}|`;
        if (!event.type) {
          errors.push(`Missing event type for ${event.name} in ${data.displayName}`);
          eventsContent += '|';
        } else {
          eventsContent += `${event.type.names.join(',')}|`;
        }
      });

      file.addline(eventsContent + '\n\n');
    }

    // Errors
    if (errors.length) {
      errors.forEach((error) => {
        console.error(chalk.black.bgRed('error'), error);
      });
    }

    return Promise.resolve(file.content);
  } catch (err) {
    return Promise.reject(err);
  }
};
