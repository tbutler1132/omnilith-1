CREATE UNIQUE INDEX "organism_states_organism_sequence_unique" ON "organism_states" USING btree ("organism_id","sequence_number");
