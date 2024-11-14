import Joi from 'joi';

const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?-]).{8,}$/;
const noSpecialCharact = /^[a-zA-Z0-9_-]+$/; // Autorise uniquement les lettres, chiffres, underscores et tirets
const message = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un caractère spécial et un nombre.';

const reqRestartSchema = Joi.object({
  process: Joi.string().pattern(noSpecialCharact).required().messages({
    'string.pattern.base': 'Le nom du dossier ne doit pas contenir de caractères spéciaux.'
  }),
})

export { reqRestartSchema };
