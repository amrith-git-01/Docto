const bcrypt = require('bcrypt');

function preSaveHashPassword(schema) {
  schema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
  });
}

function preFindDeleted(schema) {
  schema.pre(/^find/, function (next) {
    this.find({ isDeleted: { $ne: true } });
    next();
  });
}

function preSavePasswordChangedAt(schema) {
  schema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
  });
}

function instanceMethodChangedPasswordAfter(schema) {
  schema.methods.changedPasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
      const changedTimeStamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );

      return JWTTimeStamp < changedTimeStamp;
    }

    return false;
  };
}

function preSaveSetUpdatedAt(schema) {
  schema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
  });
}

function preQuerySetUpdatedAt(schema) {
  schema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: Date.now() });
    next();
  });
}

function applyCommonHooks(schema) {
  preSaveHashPassword(schema);
  preFindDeleted(schema);
  preSavePasswordChangedAt(schema);
  instanceMethodChangedPasswordAfter(schema);
  preSaveSetUpdatedAt(schema);
  preQuerySetUpdatedAt(schema);
}

module.exports = { applyCommonHooks };
