# Node-RED Library File Store Plugin

**Requires Node-RED 1.3 or later.**


Node-RED allows you to import and export flows from a local library. The built-in
library stores its contents in `~/.node-red/lib`.

This library plugin allows you to add additional libraries in other locations.

For example, you may have a directory that is shared on the local network, or
automatically synced with a cloud service such as Dropbox.

If you are collaborating with other developers, this makes it easier to have a
shared library to store reusable flows and components.

### Installation

This module should be installed under `~/.node-red/` as you would any other
Node-RED node module.

    npm install @node-red/library-file-store


### Configuration

1. Edit your Node-RED settings file - typically `~/.node-red/settings.js`
2. Find the `editorTheme` section and add a `library` section if one does not
   already exist.
3. Under that section add a `sources` array. Within that array you can add
   as many new file store sources as you want.

    ```
    editorTheme: {
        library: {
            sources: [
                {
                    id: "team-collaboration-library",
                    type: "node-red-library-file-store",
                    path: "/Users/tom/work/team-library/",
                    label: "Team collaboration",
                    icon: "font-awesome/fa-users"
                }
            ]
        },
    }
   ```

The configuration object can have the following properties:


Property | Description
---------|--------------
`id`     | **Required** <br> A unique, url-safe, identifier for the library. Should contain only letters, numbers and the symbols `- _`.
`type`   | **Required** <br> Must be set to `node-red-library-file-store`
`path`   | **Required** <br> The absolute path to the where the library should be stored
`label`  | An optional label to use in the editor, otherwise the `id` will be used.
`icon`   | An optional icon from [FontAwesome 4.7](https://fontawesome.com/v4.7.0/icons/).
`types`  | By default the library will be used to store all types of object. It can be restricted to certain types by setting this property to an array of the acceptable types. <br> For example, to restrict it to just flows, set this property to `["flows"]`.
`readOnly` | To make this a read-only library so it can only be used to import from, set this property to `true`.