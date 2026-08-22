import { ApiError } from "../../common/utils/ApiError.js";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export interface McqOption {
    value: string;
    isCorrect: boolean;
}

/**
 * Converts a model-generated MCQ (string options + correct_option letter) into
 * the database format ({ value, isCorrect }[]). Validates the invariant that
 * the model must produce exactly 4 options and a valid A-D letter, so a broken
 * answer key can never be persisted silently.
 */
export const mapMcqOptions = (options: string[], correctOption: string): McqOption[] => {
    if (!Array.isArray(options) || options.length !== 4) {
        throw ApiError.internal("MCQ must have exactly 4 options");
    }
    if (!OPTION_LETTERS.includes(correctOption as (typeof OPTION_LETTERS)[number])) {
        throw ApiError.internal(`MCQ has invalid correct_option: "${correctOption}"`);
    }

    return options.map((value, idx) => ({
        value,
        isCorrect: correctOption === OPTION_LETTERS[idx],
    }));
};
