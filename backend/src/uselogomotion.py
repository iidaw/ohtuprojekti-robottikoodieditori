# pylint: skip-file
"""Main module for the compiler.
"""
import argparse
import os
from logomotion.src.parser.parser import Parser
import dotenv
from logomotion.src.entities.symbol_tables import SymbolTables
from logomotion.src.entities.preconfigured_functions import initialize_logo_functions
from logomotion.src.lexer.lexer import Lexer
from logomotion.src.code_generator.code_generator import JavaCodeGenerator
from logomotion.src.code_generator.preconf_code_generator import (
    JavaPreconfFuncsGenerator,
)
from logomotion.src.utils.console_io import ConsoleIO
from logomotion.src.utils.error_handler import ErrorHandler
from logomotion.src.utils.logger import Logger

# Load variables from .env file
dotenv.load_dotenv()
MESSAGE_LANG = "FIN"
CODE_GEN_LANG = "Java"


def main(LOGO_CODE, path):
    def get_code_generator():
        """Checks that given programming language is valid in
        .env file and returns a new instance of CodeGenerator class,
        and creates the preconfigured functions generator.
        Preconf generator needs to use the same generator so that
        the mangled namespace is  the same"""

        if CODE_GEN_LANG == "Java":
            preconf_gen = JavaPreconfFuncsGenerator()
            jcg = JavaCodeGenerator(logger=logger)
            preconf_gen.set_code_generator(jcg)
            funcs_dict = preconf_gen.get_funcs()
            jcg.set_preconf_funcs_dict(funcs_dict)
            jcg.add_env_variables(
                wheelDiameter=os.getenv("WHEEL_DIAM"),
                wheelDistance=os.getenv("AXLE_LEN"),
                leftMotor=os.getenv("LEFT_MOTOR_PORT"),
                rightMotor=os.getenv("RIGHT_MOTOR_PORT"),
                motorSpeed=os.getenv("MOVEMENT_SPD"),
                motorRotationSpeed=os.getenv("ROTATION_SPD"),
            )
            return jcg

        err_msg = (
            f"{CODE_GEN_LANG} is not an implemented"
            "programming language for code generator"
        )
        raise Exception(err_msg)

    def find_line_and_position_based_on_index(index: int) -> tuple:
        """Looks at the multiline string of LOGO_CODE and finds line and
        position with newlines considered of given index

        Args:
            index (int): index in multiline string

        Returns:
            tuple (int, int): line and position of given index
        """
        lines_of_logo = LOGO_CODE.splitlines()
        line_number = 1

        for line in lines_of_logo:
            if index - (len(line) + 1) < 0:
                break

            index -= len(line) + 1
            line_number += 1

        return (line_number, index + 1)

    def compile_logo():
        """Compiles a user given logo file and generates code if there are no errors.
        Prints lexer & parser results if debug flag (-d, --debug) is on."""

        logger.debug(LOGO_CODE + "\n")
        # Tokenize
        tokens = lexer.tokenize_input(LOGO_CODE)
        logger.debug("Lexer tokens:")
        logger.debug("\n".join((str(token) for token in tokens)) + "\n")

        # Parse and type analyzation
        start_node = parser.parse(LOGO_CODE)
        if start_node:
            start_node.check_types()
            logger.debug("Parser AST:")
            logger.debug(console_io.get_formatted_ast(start_node))

        # Code generation, if there are no errors
        if start_node and not error_handler.errors:
            logger.debug("Generated code:")
            # print('jahuu')
            start_node.generate_code()

            code_generator.write(path)

            return ([], [])
        else:
            # error_handler.create_json_file()
            error_handler.write_errors_to_console()

            # want to have error messages with format line, start, end
            errors_with_pretty_position = []
            errors_with_raw_position = []
            for error in error_handler.errors:
                start_index = error["start"]
                end_index = error["end"]
                length = end_index - start_index

                line, position = find_line_and_position_based_on_index(
                    start_index)

                errors_with_pretty_position.append(
                    {
                        "fin": error["fin"],
                        "eng": error["eng"],
                        "start": position,
                        "end": position + length,
                        "line": line,
                    }
                )

                errors_with_raw_position.append(
                    {
                        "fin": error["fin"],
                        "eng": error["eng"],
                        "start": start_index,
                        "end": start_index + length,
                    }
                )

            return (errors_with_pretty_position, errors_with_raw_position)

    # Create required classes for the compiler
    console_io = ConsoleIO()
    error_handler = ErrorHandler(console_io=console_io, language=MESSAGE_LANG)
    logger = Logger(console_io, error_handler)
    lexer = Lexer(logger)
    lexer.build()
    symbol_tables = SymbolTables()
    code_generator = get_code_generator()
    parser = Parser(lexer, logger, symbol_tables, code_generator)

    symbol_tables.functions = initialize_logo_functions(
        symbol_tables.functions)

    # Compile from logo to language defined with CODE_GEN .env variable
    return compile_logo() or []


# if __name__ == "__main__":
def logo(LOGO_CODE, path):
    main(LOGO_CODE, path)
