import { Router } from 'express';
import * as Schemes from '../repos/schemes.js';
import { checkEligibility } from '../services/eligibility.js';

const router = Router();

/**
 * POST /api/eligibility/check — public AI eligibility pre-check.
 */
router.post('/check', async (req, res, next) => {
  try {
    const {
      category, educationLevel, course = '', institution = '',
      institutionType = 'Government', annualIncome, domicileState = '',
      previousPercentage = 0, gender = 'NA', age = 0,
      universityRecognised = true, isPvtg = false, isDisabled = false,
    } = req.body;

    if (!category || !educationLevel || annualIncome === undefined || annualIncome === '') {
      return res.status(400).json({ message: 'Category, education level and annual family income are required.' });
    }

    const schemes = await Schemes.list({ activeOnly: true });
    const profile = {
      category, educationLevel, course, institution, institutionType,
      annualIncome: Number(annualIncome), domicileState,
      previousPercentage: Number(previousPercentage), gender, age: Number(age),
      universityRecognised, isPvtg, isDisabled,
    };

    return res.json(checkEligibility(profile, schemes));
  } catch (err) {
    return next(err);
  }
});

export default router;
