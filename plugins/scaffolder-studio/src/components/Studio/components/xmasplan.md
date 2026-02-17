

# Make publish implementable

- Come up with a solution where users can use their own publish solution via an extensions point
- Gate the current publish ui features behind this extension point. Maybe provide a default extension that publihses in-app.
- Provide an SCM agnostic publish impl that syncs a template to a PR.

# Migrate to the new frontend system
- Migrate the plugin to the new frontend system. (Consider migrating using an alpha export)

# Extensive testing in roadie and native backstage

- Test full install flow
- Test manual creation of existing templates in roadie.roadie
- Release it without telling it to anyone and ask feedback from backstage users